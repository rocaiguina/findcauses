"""Transactional email through Resend's HTTP API. With EMAIL_DELIVERY=log, emails are printed to the console."""

import json
import logging
import urllib.request
from html import escape

from django.conf import settings

log = logging.getLogger(__name__)


def send(to: str, subject: str, text: str, html: str) -> None:
    if settings.EMAIL_DELIVERY == "log" or not settings.RESEND_API_KEY:
        log.info("[email] To: %s\n[email] Subject: %s\n%s", to, subject, text)
        return
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({"from": settings.EMAIL_FROM, "to": to, "subject": subject, "text": text, "html": html}).encode(),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "FindCauses",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        res.read()


def send_sign_in_link(to: str, url: str) -> None:
    note = "The link works once and expires in 30 minutes. If you didn't ask for it, ignore this email."
    send(
        to,
        "Your FindCauses sign-in link",
        f"Sign in to FindCauses:\n{url}\n\n{note}",
        f"""<div style="font-family:Inter,Arial,sans-serif;color:#1e1e2a;max-width:480px">
<p style="font-size:16px">Sign in to FindCauses to manage your organization's page.</p>
<p><a href="{escape(url)}" style="display:inline-block;background:#5266eb;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Sign in</a></p>
<p style="font-size:13px;color:#6b6b7b">{note}</p>
</div>""",
    )
