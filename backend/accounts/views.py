"""Passwordless sign-in for nonprofit staff: email a one-time link, then a normal Django session."""

import logging
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import login, logout
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view
from rest_framework.response import Response

from directory.models import Claim

from .emails import send_sign_in_link
from .models import SignInLink, User

log = logging.getLogger(__name__)


def safe_next(value) -> str:
    """Only paths on this site, so a sign-in link can't send people elsewhere."""
    return value if isinstance(value, str) and value.startswith("/") and not value.startswith("//") else "/dashboard"


@api_view(["POST"])
def request_link(request):
    email = str(request.data.get("email", "")).strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Enter a valid email address."}, status=400)
    next_path = safe_next(request.data.get("next"))

    # One link a minute per address, so the form can't be used to flood someone's inbox.
    if SignInLink.objects.filter(email=email, created_at__gte=timezone.now() - timedelta(minutes=1)).exists():
        return Response({"sentTo": email})
    token = SignInLink.issue(email, next_path)
    try:
        send_sign_in_link(email, f"{settings.SITE_URL}/api/auth/callback?token={quote(token)}")
    except Exception:
        log.exception("Sign-in email failed")
        SignInLink.revoke(token)
        return Response({"error": "We couldn't send the email. Please try again in a minute."}, status=502)
    return Response({"sentTo": email})


def callback(request):
    link = SignInLink.redeem(request.GET.get("token", ""))
    if not link:
        return HttpResponseRedirect("/signin?e=expired")
    user, _ = User.objects.get_or_create(email=link.email)
    if not user.is_active:
        return HttpResponseRedirect("/signin?e=expired")
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return HttpResponseRedirect(safe_next(link.next))


@api_view(["POST"])
def sign_out(request):
    logout(request)
    return Response({"ok": True})


@ensure_csrf_cookie
@api_view(["GET"])
def me(request):
    """The signed-in person and the organizations they manage (or asked to). Also sets the CSRF cookie."""
    if not request.user:
        return Response({"user": None, "claims": []})
    claims = (
        Claim.objects.filter(user=request.user)
        .select_related("organization")
        .prefetch_related("organization__claims", "organization__filings", "organization__financials")
    )
    return Response(
        {
            "user": {"email": request.user.email},
            "claims": [
                {
                    "id": str(c.id),
                    "status": c.status,
                    "method": c.method,
                    "createdAt": c.created_at.isoformat(),
                    "organization": {
                        "id": str(c.organization.id),
                        "slug": c.organization.slug,
                        "name": c.organization.name,
                        "profileStatus": c.organization.profile_status,
                        "check": c.organization.certified_check(),
                    },
                }
                for c in claims
            ],
        }
    )
