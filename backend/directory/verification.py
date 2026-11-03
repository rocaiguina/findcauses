"""
Instant claim verification: an email on the organization's own website domain proves the person works there
(like "claim your business" on review sites). Free mail providers and shared website hosts never match.
"""

from urllib.parse import urlparse

FREE_MAIL = {
    "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com",
    "me.com", "aol.com", "protonmail.com", "proton.me", "gmx.com", "mail.com", "yahoo.es", "hotmail.es",
    "prtc.net", "coqui.net", "libertypr.net", "onelinkpr.net",
}  # fmt: skip

# A website on one of these hosts says nothing about who owns an email domain.
SHARED_HOSTS = {
    "facebook.com", "instagram.com", "linktr.ee", "wixsite.com", "wix.com", "wordpress.com", "blogspot.com",
    "google.com", "squarespace.com", "weebly.com", "godaddysites.com", "carrd.co", "linkedin.com", "x.com",
    "twitter.com", "youtube.com",
}  # fmt: skip


def site_domain(website: str) -> str | None:
    if not website:
        return None
    host = (urlparse(website if "://" in website else f"https://{website}").hostname or "").lower()
    domain = host.removeprefix("www.")
    if not domain or any(domain == h or domain.endswith(f".{h}") for h in SHARED_HOSTS):
        return None
    return domain


def email_matches_website(email: str, website: str) -> bool:
    mail = email.rpartition("@")[2].lower()
    site = site_domain(website)
    if not site or not mail or mail in FREE_MAIL:
        return False
    return mail == site or mail.endswith(f".{site}") or site.endswith(f".{mail}")
