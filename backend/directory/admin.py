from django.contrib import admin, messages
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    BoardMember,
    Claim,
    Financials,
    Form990Upload,
    FundingNeed,
    ImpactMetric,
    IrsFiling,
    Milestone,
    NetworkTie,
    Organization,
    RoadmapItem,
    Subscription,
)

admin.site.site_header = "FindCauses admin"
admin.site.site_title = "FindCauses admin"
admin.site.index_title = "Directory, claims and profiles"


class SectionInline(admin.TabularInline):
    extra = 0


class BoardInline(SectionInline):
    model = BoardMember


class MilestoneInline(SectionInline):
    model = Milestone


class MetricInline(SectionInline):
    model = ImpactMetric


class NetworkInline(SectionInline):
    model = NetworkTie


class RoadmapInline(SectionInline):
    model = RoadmapItem


class NeedInline(SectionInline):
    model = FundingNeed


class FinancialsInline(admin.StackedInline):
    model = Financials
    extra = 0


class Form990Inline(admin.StackedInline):
    model = Form990Upload
    extra = 0
    fields = ["download", "uploaded_at", "verified_at"]
    readonly_fields = ["download", "uploaded_at"]

    @admin.display(description="File")
    def download(self, obj):
        url = reverse("admin-990", args=[obj.organization_id])
        return format_html('<a href="{}" target="_blank">{}</a>', url, obj.file_name)


class FilingInline(admin.TabularInline):
    model = IrsFiling
    extra = 0
    fields = ["tax_year", "form_type", "total_revenue", "total_expenses", "net_assets", "pdf_url"]


class ClaimInline(admin.TabularInline):
    model = Claim
    extra = 0
    fields = ["user", "claimant_name", "claimant_role", "status", "method", "created_at"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["user"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "cause", "city", "profile_status", "claimed", "certified", "latest_990"]
    list_filter = ["profile_status", "cause"]
    search_fields = ["name", "irs_name", "ein", "city"]
    prepopulated_fields = {"slug": ["name"]}
    actions = ["publish", "reject"]
    inlines = [
        ClaimInline,
        Form990Inline,
        FinancialsInline,
        FilingInline,
        NeedInline,
        MetricInline,
        MilestoneInline,
        NetworkInline,
        RoadmapInline,
        BoardInline,
    ]
    fieldsets = [
        (None, {"fields": ["name", "slug", "cause", "mission", "tags", "city", "state", "website", "email", "phone"]}),
        ("IRS record", {"fields": ["ein", "irs_name", "irs_match_score", "ntee_code", "irs_ruling_date"]}),
        (
            "Profile",
            {
                "fields": [
                    "profile_status",
                    "tagline",
                    "year_founded",
                    "geographic_scope",
                    "focus_areas",
                    ("contact_name", "contact_title"),
                    ("contact_email", "contact_phone"),
                    "submitted_at",
                    "reviewed_at",
                ]
            },
        ),
        (
            "Stewardship",
            {
                "classes": ["collapse"],
                "fields": [
                    "independent_audit",
                    "auditor",
                    "conflict_of_interest_policy",
                    "whistleblower_policy",
                    "document_retention_policy",
                    "funder_reporting",
                    "impact_measurement",
                    "restricted_funds",
                ],
            },
        ),
    ]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("claims", "filings", "financials").select_related("form990")

    @admin.display(boolean=True)
    def claimed(self, obj):
        return obj.certified_check()["claimed"]

    @admin.display(boolean=True)
    def certified(self, obj):
        return obj.is_certified

    @admin.display(description="Latest 990")
    def latest_990(self, obj):
        years = [f.tax_year for f in obj.filings.all()]
        return max(years) if years else "—"

    @admin.action(description="Publish profile (and mark its uploaded 990 verified)")
    def publish(self, request, queryset):
        now = timezone.now()
        for org in queryset:
            org.profile_status = Organization.Profile.PUBLISHED
            org.reviewed_at = now
            org.save(update_fields=["profile_status", "reviewed_at"])
            Form990Upload.objects.filter(organization=org).update(verified_at=now)
            # The person who applied for a new organization now manages it.
            org.claims.filter(status=Claim.Status.PENDING).update(status=Claim.Status.ACTIVE, decided_at=now)
        messages.success(request, f"Published {queryset.count()} profile(s).")

    @admin.action(description="Reject submitted profile")
    def reject(self, request, queryset):
        queryset.update(profile_status=Organization.Profile.REJECTED, reviewed_at=timezone.now())


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    """Claims that weren't verified by email domain land here as Pending: check the person, then approve or reject."""

    list_display = ["organization", "claimant_name", "claimant_role", "user", "org_website", "status", "method", "created_at"]
    list_filter = ["status", "method"]
    search_fields = ["organization__name", "user__email", "claimant_name"]
    autocomplete_fields = ["user", "organization"]
    actions = ["approve", "reject"]

    @admin.display(description="Organization website")
    def org_website(self, obj):
        return obj.organization.website or obj.organization.email or "—"

    @admin.action(description="Approve selected claims")
    def approve(self, request, queryset):
        queryset.update(status=Claim.Status.ACTIVE, decided_at=timezone.now())

    @admin.action(description="Reject selected claims")
    def reject(self, request, queryset):
        queryset.update(status=Claim.Status.REJECTED, decided_at=timezone.now())


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["email", "query", "created_at"]
    search_fields = ["email"]
