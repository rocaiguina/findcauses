"""Emails about claims: staff hear about new ones, claimants hear the decision.

A failed email is logged and never blocks the claim or the admin action; the claim is still in the admin.
"""

import logging
from html import escape

from django.conf import settings

from accounts.emails import send
from accounts.models import User

from .models import Claim

log = logging.getLogger(__name__)


def _send(to: str, subject: str, lines: list[str], link_label: str, url: str) -> None:
    body = "".join(f'<p style="font-size:15px">{escape(line)}</p>' for line in lines)
    try:
        send(
            to,
            subject,
            "\n\n".join([*lines, f"{link_label}: {url}"]),
            f"""<div style="font-family:Inter,Arial,sans-serif;color:#1e1e2a;max-width:480px">
{body}
<p><a href="{escape(url)}" style="display:inline-block;background:#5266eb;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">{escape(link_label)}</a></p>
</div>""",
        )
    except Exception:
        log.exception("Claim email failed")


def new_claim(claim: Claim) -> None:
    """Tells staff about a new claim. Claims verified by email domain are already active, so those are just for their information."""
    org = claim.organization
    if claim.status == Claim.Status.ACTIVE:
        subject = f"New claim verified: {org.name}"
        outcome = "It was approved automatically because the email matches the organization's website."
    else:
        subject = f"Claim to review: {org.name}"
        outcome = "It is waiting for your review."
    lines = [
        f"{claim.claimant_name} ({claim.claimant_role}, {claim.user.email}) claimed {org.name}.",
        f"Organization website: {org.website or 'none on file'}.",
        outcome,
    ]
    url = f"{settings.SITE_URL}/admin/directory/claim/{claim.pk}/change/"
    for email in User.objects.filter(is_staff=True, is_active=True).values_list("email", flat=True):
        _send(email, subject, lines, "Open the claim", url)


def claim_decided(claim: Claim) -> None:
    """Tells the claimant whether their claim was approved or rejected."""
    org = claim.organization
    if claim.status == Claim.Status.ACTIVE:
        _send(
            claim.user.email,
            f"You now manage {org.name} on FindCauses",
            [f"Your claim for {org.name} was approved. You can now complete its profile and get its website badge."],
            "Go to your dashboard",
            f"{settings.SITE_URL}/dashboard",
        )
    elif claim.status == Claim.Status.REJECTED:
        _send(
            claim.user.email,
            f"Your claim for {org.name} wasn't approved",
            [f"We couldn't confirm that you represent {org.name}, so your claim wasn't approved."],
            "See your dashboard",
            f"{settings.SITE_URL}/dashboard",
        )
