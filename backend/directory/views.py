from django.db import IntegrityError, transaction
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import notifications, serializers
from .models import (
    BoardMember,
    Claim,
    Financials,
    Form990Upload,
    FundingNeed,
    ImpactMetric,
    Milestone,
    NetworkTie,
    Organization,
    RoadmapItem,
    Subscription,
)
from .profile_form import SECTIONS, parse_form, parse_profile, section_status, submit_section
from .verification import email_matches_website

SIGN_IN_REQUIRED = Response({"error": "Sign in first."}, status=401)

# --- Public directory


@api_view(["GET"])
def directory(request):
    """Every organization: published profiles, and pages built from IRS data for the rest."""
    orgs = serializers.with_related(Organization.objects.exclude(profile_status=Organization.Profile.PENDING))
    published = [o for o in orgs if o.has_profile]
    return Response(
        {
            "organizations": [serializers.profile(o) for o in published],
            "listings": [serializers.listing(o) for o in orgs if not o.has_profile],
        }
    )


@api_view(["GET"])
def organization_profile(request, slug):
    org = get_object_or_404(serializers.with_related(Organization.objects), slug=slug)
    if not org.has_profile:
        raise Http404
    return Response(serializers.profile(org))


@api_view(["GET"])
def organization_listing(request, slug):
    org = get_object_or_404(serializers.with_related(Organization.objects), slug=slug)
    if org.profile_status == Organization.Profile.PENDING:
        raise Http404
    return Response(serializers.listing(org))


def form990_pdf(request, slug):
    org = get_object_or_404(Organization, slug=slug, profile_status=Organization.Profile.PUBLISHED)
    upload = get_object_or_404(Form990Upload, organization=org)
    return _pdf(upload)


def admin_form990_pdf(request, org_id):
    if not (request.user.is_authenticated and request.user.is_staff):
        raise Http404
    return _pdf(get_object_or_404(Form990Upload, organization_id=org_id))


def _pdf(upload):
    res = HttpResponse(bytes(upload.data), content_type="application/pdf")
    res["Content-Disposition"] = f'inline; filename="{upload.file_name.replace(chr(34), "")}"'
    return res


@api_view(["POST"])
def subscribe(request):
    email = str(request.data.get("email", "")).strip().lower()
    query = str(request.data.get("query", ""))[:1000]
    if "@" not in email:
        return Response({"error": "Enter a valid email."}, status=400)
    Subscription.objects.get_or_create(email=email, query=query)
    return Response({"ok": True})


# --- Nonprofit accounts: claims and profiles


@api_view(["POST"])
def claim(request, slug):
    if not request.user:
        return SIGN_IN_REQUIRED
    org = get_object_or_404(Organization, slug=slug)
    name = str(request.data.get("name", "")).strip()[:200]
    role = str(request.data.get("role", "")).strip()[:200]
    if not name or not role:
        return Response({"errors": {"name": "Enter your name and your role."}}, status=422)
    verified = email_matches_website(request.user.email, org.website)
    c, created = Claim.objects.get_or_create(
        user=request.user,
        organization=org,
        defaults={
            "claimant_name": name,
            "claimant_role": role,
            "method": Claim.Method.DOMAIN if verified else Claim.Method.REVIEW,
            "status": Claim.Status.ACTIVE if verified else Claim.Status.PENDING,
            "decided_at": timezone.now() if verified else None,
        },
    )
    if created:
        notifications.new_claim(c)
    return Response({"id": str(c.id), "status": c.status, "method": c.method}, status=201 if created else 200)


def _managed(request, slug):
    """The organization, if the signed-in person has an active claim on it."""
    if not request.user:
        return None
    return (
        serializers.with_related(Organization.objects)
        .filter(slug=slug, claims__user=request.user, claims__status=Claim.Status.ACTIVE)
        .first()
    )


@api_view(["GET"])
def managed_profile(request, slug):
    """The profile as its managers see it: form values, and which sections are complete."""
    org = _managed(request, slug)
    if not org:
        return Response({"error": "You don't manage this organization."}, status=403)
    form = serializers.editable_form(org)
    return Response(
        {
            "organization": {"slug": org.slug, "name": org.name, "ein": serializers._ein(org)},
            "profileStatus": org.profile_status,
            "check": org.certified_check(),
            "sections": section_status(form, certified=org.has_profile),
            **form,
        }
    )


@api_view(["POST"])
def save_profile_section(request, slug, section):
    """
    Saves one section. Until the profile is complete sections stay in a private draft, and the IRS page stays up;
    the save that completes it publishes everything. After that, each save goes live on its own.
    """
    org = _managed(request, slug)
    if not org:
        return Response({"error": "You don't manage this organization."}, status=403)
    if section not in SECTIONS:
        raise Http404
    if org.profile_status not in (Organization.Profile.NONE, Organization.Profile.PUBLISHED):
        return Response({"error": "This profile is with our team, so it can't be edited right now."}, status=409)

    form = serializers.editable_form(org)
    submit_section(form, section, request.data)
    files = request.FILES if section == "financials" else {}
    parsed = parse_form(form, files, certified=org.has_profile)
    if org.ein and parsed.ein != org.ein:
        parsed.errors["ein"] = "The EIN doesn't match IRS records for this organization."
    errors = {k: v for k, v in parsed.errors.items() if k in SECTIONS[section].keys}
    if errors:
        return Response({"errors": errors}, status=422)

    published_now = False
    with transaction.atomic():
        if parsed.file:
            _save_990(org, parsed.file)
        if org.has_profile:
            _write_sections(org, parsed, [section])
            org.save()
        elif parsed.errors:
            org.profile_draft = {"values": form["values"], "lists": form["lists"]}
            org.save(update_fields=["profile_draft", "updated_at"])
        else:
            org.profile_draft = {}
            _save_profile(org, parsed, status=Organization.Profile.PUBLISHED)
            published_now = True
    if published_now:
        notifications.profile_published(org)
    if parsed.file:
        notifications.form990_uploaded(org)
    return Response({"published": org.has_profile, "publishedNow": published_now})


@api_view(["POST"])
def apply(request):
    """A nonprofit that isn't in the directory yet. It goes live once an admin publishes it."""
    if not request.user:
        return SIGN_IN_REQUIRED
    parsed = parse_profile(request.data, request.FILES, new_organization=True, file_required=True)
    if not parsed.errors and Organization.objects.filter(ein=parsed.ein).exists():
        parsed.errors["ein"] = "This organization is already listed. Find it in the directory and claim it instead."
    if parsed.errors:
        return Response({"errors": parsed.errors}, status=422)

    base = slugify(parsed.fields["name"])[:100] or "organization"
    slug, n = base, 2
    while Organization.objects.filter(slug=slug).exists():
        slug, n = f"{base}-{n}", n + 1
    try:
        with transaction.atomic():
            org = Organization.objects.create(
                slug=slug, ein=parsed.ein, name=parsed.fields["name"], irs_ruling_date=parsed.irs_ruling_date
            )
            _save_profile(org, parsed, status=Organization.Profile.PENDING)
            c = Claim.objects.create(
                user=request.user,
                organization=org,
                method=Claim.Method.REVIEW,
                claimant_name=parsed.fields["contact_name"],
                claimant_role=parsed.fields["contact_title"],
            )
    except IntegrityError:
        return Response({"errors": {"ein": "This organization is already listed."}}, status=409)
    notifications.new_claim(c)
    return Response({"slug": org.slug}, status=201)


LIST_MODELS = {
    "impactMetrics": ImpactMetric,
    "trackRecord": Milestone,
    "networks": NetworkTie,
    "roadmap": RoadmapItem,
    "board": BoardMember,
}


def _write_sections(org, parsed, names):
    """Copies the named sections onto the organization and its related rows. The caller saves `org`."""
    for section in (SECTIONS[n] for n in names):
        for attr in section.fields:
            setattr(org, attr, parsed.fields[attr])
        for key in section.lists:
            model = LIST_MODELS[key]
            model.objects.filter(organization=org).delete()
            model.objects.bulk_create(model(organization=org, position=i, **row) for i, row in enumerate(parsed.lists[key]))
        if section.financials:
            org.financials.all().delete()
            Financials.objects.create(organization=org, **parsed.financials)
        if section.needs:
            FundingNeed.objects.filter(organization=org).delete()
            FundingNeed.objects.bulk_create(FundingNeed(organization=org, position=i, **n) for i, n in enumerate(parsed.needs))


def _save_990(org, file):
    """A new 990 upload needs verifying again."""
    Form990Upload.objects.update_or_create(
        organization=org,
        defaults={"file_name": file.name[:255], "data": file.read(), "verified_at": None},
    )


@transaction.atomic
def _save_profile(org, parsed, status):
    """Replaces the organization's whole profile with the submitted one."""
    _write_sections(org, parsed, SECTIONS)
    org.profile_status = status
    org.submitted_at = timezone.now()
    org.save()
    if parsed.file:
        _save_990(org, parsed.file)
