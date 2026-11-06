import io
import json
import re
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import SignInLink, User

from .models import Claim, IrsFiling, Organization
from .verification import email_matches_website


def profile_form(**overrides):
    rows = lambda n, **r: json.dumps([{k: f"{v} {i}" for k, v in r.items()} for i in range(n)])  # noqa: E731
    data = {
        "name": "Test Org",
        "tagline": "Tagline",
        "ein": "66-0000001",
        "website": "https://testorg.org",
        "city": "San Juan",
        "state": "PR",
        "yearFounded": "1990",
        "geographicScope": "Puerto Rico",
        "cause": "economy",
        "focusAreas": "A, B",
        "mission": "Mission",
        "fiscalYear": str(timezone.now().year - 1),
        "totalRevenue": "3000000",
        "contributions": "1000000",
        "programRevenue": "100000",
        "totalExpenses": "2000000",
        "programExpenses": "1500000",
        "managementExpenses": "400000",
        "fundraisingExpenses": "100000",
        "totalAssets": "1000000",
        "netAssets": "500000",
        "employees": "20",
        "volunteers": "5",
        "independentAudit": "yes",
        "auditor": "Auditor",
        "conflictOfInterestPolicy": "yes",
        "whistleblowerPolicy": "no",
        "documentRetentionPolicy": "yes",
        "funderReporting": "Reports",
        "impactMeasurement": "Measures",
        "restrictedFunds": "Tracked",
        "contactName": "Ana",
        "contactTitle": "ED",
        "contactEmail": "ana@testorg.org",
        "contactPhone": "787",
        "certify": "on",
        "impactMetrics": rows(2, label="Metric", value="1"),
        "trackRecord": rows(2, year="2020", title="T", description="D"),
        "networks": rows(1, name="N", type="T", description="D"),
        "roadmap": rows(2, timeframe="2027", goal="G", description="D"),
        "board": rows(3, name="B", role="R", affiliation="A"),
        "fundingNeeds": json.dumps([{"title": "Need", "type": "program", "amount": "1000", "timeframe": "2027", "description": "D"}]),
    }
    data.update(overrides)
    return data


@override_settings(EMAIL_DELIVERY="log", SITE_URL="http://testserver")
class NonprofitFlowTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(slug="test-org", name="Test Org", ein="660000001", website="https://www.testorg.org")
        IrsFiling.objects.create(organization=self.org, tax_year=timezone.now().year - 2, form_type="990")

    def sign_in(self, email):
        with self.assertLogs("accounts.emails", "INFO") as logs:
            res = self.client.post("/api/auth/link", {"email": email, "next": "/dashboard"}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        token = re.search(r"token=([\w-]+)", "\n".join(logs.output)).group(1)
        res = self.client.get(f"/api/auth/callback?token={token}")
        self.assertEqual(res["Location"], "/dashboard")
        return token

    def test_sign_in_link_works_once(self):
        token = self.sign_in("ana@testorg.org")
        self.client.logout()
        self.assertEqual(self.client.get(f"/api/auth/callback?token={token}")["Location"], "/signin?e=expired")
        self.assertEqual(SignInLink.objects.count(), 1)

    def test_failed_email_can_be_retried_right_away(self):
        with patch("accounts.views.send_sign_in_link", side_effect=OSError("rejected")) as send, self.assertLogs("accounts.views", "ERROR"):
            for _ in range(2):
                res = self.client.post("/api/auth/link", {"email": "ana@testorg.org"}, content_type="application/json")
                self.assertEqual(res.status_code, 502)
        self.assertEqual(send.call_count, 2)
        self.assertEqual(SignInLink.objects.count(), 0)

    def test_domain_email_claims_instantly_and_certifies_after_profile(self):
        self.sign_in("ana@testorg.org")
        res = self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.assertEqual(res.json()["status"], "active")
        self.assertFalse(self.org.is_certified)

        res = self.client.post("/api/me/organizations/test-org/profile", profile_form())
        self.assertEqual(res.status_code, 200, res.content)
        self.org.refresh_from_db()
        self.assertEqual(self.org.profile_status, Organization.Profile.PUBLISHED)
        self.assertTrue(Organization.objects.get(pk=self.org.pk).is_certified)
        self.assertEqual(self.client.get("/api/organizations/test-org").json()["certified"], True)

    def test_other_email_waits_for_review_and_cannot_edit(self):
        self.sign_in("ana@gmail.com")
        res = self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.assertEqual(res.json()["status"], "pending")
        res = self.client.post("/api/me/organizations/test-org/profile", profile_form())
        self.assertEqual(res.status_code, 403)

    def test_stale_990_is_not_certified(self):
        self.org.filings.update(tax_year=timezone.now().year - 6)
        self.sign_in("ana@testorg.org")
        self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.client.post("/api/me/organizations/test-org/profile", profile_form())
        check = Organization.objects.get(pk=self.org.pk).certified_check()
        self.assertEqual(check, {"claimed": True, "profile": True, "recent990": False})

    def test_profile_rejects_a_different_ein(self):
        self.sign_in("ana@testorg.org")
        self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        res = self.client.post("/api/me/organizations/test-org/profile", profile_form(ein="12-3456789"))
        self.assertEqual(res.status_code, 422)
        self.assertIn("ein", res.json()["errors"])

    def test_new_application_goes_live_when_an_admin_publishes_it(self):
        self.sign_in("director@neworg.org")
        pdf = io.BytesIO(b"%PDF-1.4 test")
        pdf.name = "990.pdf"
        res = self.client.post("/api/apply", {**profile_form(ein="66-0000002", name="New Org"), "form990": pdf})
        self.assertEqual(res.status_code, 201, res.content)
        org = Organization.objects.get(ein="660000002")
        self.assertEqual(org.profile_status, Organization.Profile.PENDING)
        self.assertEqual(self.client.get(f"/api/organizations/{org.slug}").status_code, 404)

        # An admin publishes it with the admin action.
        admin_user = User.objects.create_superuser("admin@findcauses.test", "a-long-test-password")
        self.client.force_login(admin_user)
        res = self.client.post(
            "/admin/directory/organization/",
            {"action": "publish", "_selected_action": [str(org.pk)]},
        )
        self.assertEqual(res.status_code, 302)
        org.refresh_from_db()
        self.assertEqual(org.profile_status, Organization.Profile.PUBLISHED)
        self.assertIsNotNone(org.form990.verified_at)
        self.assertEqual(org.claims.get().status, Claim.Status.ACTIVE)
        # Uploaded and verified 990 for last year counts as recent.
        self.assertTrue(Organization.objects.get(pk=org.pk).is_certified)


@override_settings(EMAIL_DELIVERY="log", SITE_URL="http://testserver")
class ClaimEmailTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(slug="test-org", name="Test & Org", website="https://testorg.org")
        self.admin = User.objects.create_superuser("admin@findcauses.test", "a-long-test-password")

    def claim(self, email):
        self.client.force_login(User.objects.get_or_create(email=email)[0])
        with patch("directory.notifications.send") as send:
            res = self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.client.logout()
        return Claim.objects.get(pk=res.json()["id"]), send

    def decide(self, action, claim):
        self.client.force_login(self.admin)
        with patch("directory.notifications.send") as send:
            res = self.client.post("/admin/directory/claim/", {"action": action, "_selected_action": [str(claim.pk)]})
        self.assertEqual(res.status_code, 302)
        return send

    def test_staff_hear_about_a_claim_to_review(self):
        claim, send = self.claim("ana@gmail.com")
        send.assert_called_once()
        to, subject, text, html = send.call_args.args
        self.assertEqual(to, "admin@findcauses.test")
        self.assertEqual(subject, "Claim to review: Test & Org")
        self.assertIn("ana@gmail.com", text)
        self.assertIn(f"/admin/directory/claim/{claim.pk}/change/", text)
        self.assertIn("Test &amp; Org", html)

    def test_staff_hear_about_a_verified_claim(self):
        _, send = self.claim("ana@testorg.org")
        self.assertEqual(send.call_args.args[1], "New claim verified: Test & Org")

    def test_repeating_a_claim_doesnt_email_again(self):
        self.claim("ana@gmail.com")
        _, send = self.claim("ana@gmail.com")
        send.assert_not_called()

    def test_claimant_hears_the_decision_once(self):
        claim, _ = self.claim("ana@gmail.com")
        send = self.decide("approve", claim)
        send.assert_called_once()
        self.assertEqual(send.call_args.args[0], "ana@gmail.com")
        self.assertEqual(send.call_args.args[1], "You now manage Test & Org on FindCauses")
        claim.refresh_from_db()
        self.assertEqual(claim.status, Claim.Status.ACTIVE)
        self.assertIsNotNone(claim.decided_at)
        self.decide("approve", claim).assert_not_called()

        send = self.decide("reject", claim)
        self.assertEqual(send.call_args.args[1], "Your claim for Test & Org wasn't approved")

    def test_a_failed_email_doesnt_block_the_claim(self):
        self.client.force_login(User.objects.create(email="ana@gmail.com"))
        with patch("directory.notifications.send", side_effect=OSError("rejected")), self.assertLogs("directory.notifications", "ERROR"):
            res = self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.assertEqual(res.status_code, 201)

    def test_rejecting_an_application_answers_the_applicant(self):
        pending = Organization.objects.create(slug="new-org", name="New Org", profile_status=Organization.Profile.PENDING)
        user = User.objects.create(email="director@neworg.org")
        claim = Claim.objects.create(user=user, organization=pending, method=Claim.Method.REVIEW, claimant_name="D", claimant_role="ED")
        self.client.force_login(self.admin)
        with patch("directory.notifications.send") as send:
            self.client.post("/admin/directory/organization/", {"action": "reject", "_selected_action": [str(pending.pk)]})
        self.assertEqual(send.call_args.args[0], "director@neworg.org")
        claim.refresh_from_db()
        self.assertEqual(claim.status, Claim.Status.REJECTED)


class DomainMatchTests(TestCase):
    def test_matches(self):
        self.assertTrue(email_matches_website("a@cne.org", "https://www.cne.org/about"))
        self.assertTrue(email_matches_website("a@mail.cne.org", "cne.org"))
        self.assertFalse(email_matches_website("a@gmail.com", "https://gmail.com"))
        self.assertFalse(email_matches_website("a@facebook.com", "https://facebook.com/someorg"))
        self.assertFalse(email_matches_website("a@other.org", "https://cne.org"))
        self.assertFalse(email_matches_website("a@cne.org", ""))
