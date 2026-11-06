import io
import json
import re
import tempfile
from datetime import date
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import SignInLink, User

from .models import Claim, Form990Upload, IrsFiling, Organization
from .profile_form import SECTIONS, parse_profile
from .verification import email_matches_website


SECTION_NAMES = ["basics", "mission", "track-record", "opportunities", "financials", "governance", "contact"]


def save_all_sections(client, slug="test-org", **overrides):
    """Saves every section in turn and returns the last response, as a nonprofit would."""
    for name in SECTION_NAMES:
        res = client.post(f"/api/me/organizations/{slug}/profile/{name}", profile_form(**overrides))
    return res


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

        res = save_all_sections(self.client)
        self.assertEqual(res.status_code, 200, res.content)
        self.org.refresh_from_db()
        self.assertEqual(self.org.profile_status, Organization.Profile.PUBLISHED)
        self.assertTrue(Organization.objects.get(pk=self.org.pk).is_certified)
        self.assertEqual(self.client.get("/api/organizations/test-org").json()["certified"], True)

    def test_other_email_waits_for_review_and_cannot_edit(self):
        self.sign_in("ana@gmail.com")
        res = self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.assertEqual(res.json()["status"], "pending")
        res = self.client.post("/api/me/organizations/test-org/profile/basics", profile_form())
        self.assertEqual(res.status_code, 403)

    def test_stale_990_is_not_certified(self):
        self.org.filings.update(tax_year=timezone.now().year - 6)
        self.sign_in("ana@testorg.org")
        self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        save_all_sections(self.client)
        check = Organization.objects.get(pk=self.org.pk).certified_check()
        self.assertEqual(check, {"claimed": True, "profile": True, "recent990": False})

    def test_profile_rejects_a_different_ein(self):
        self.sign_in("ana@testorg.org")
        self.client.post("/api/listings/test-org/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        res = self.client.post("/api/me/organizations/test-org/profile/basics", profile_form(ein="12-3456789"))
        self.assertEqual(res.status_code, 422)
        self.assertIn("ein", res.json()["errors"])

    def test_new_application_goes_live_when_an_admin_publishes_it(self):
        self.sign_in("director@neworg.org")
        pdf = io.BytesIO(b"%PDF-1.4 test")
        pdf.name = "990.pdf"
        res = self.client.post("/api/apply", {**profile_form(ein="66-0000002", name="New Org", irsRulingDate="2010-06"), "form990": pdf})
        self.assertEqual(res.status_code, 201, res.content)
        org = Organization.objects.get(ein="660000002")
        self.assertEqual(org.irs_ruling_date.isoformat(), "2010-06-01")
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
class MultipleCausesTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(slug="test-org", name="Test Org", ein="660000001", website="https://testorg.org")
        IrsFiling.objects.create(organization=self.org, tax_year=timezone.now().year - 2, form_type="990")
        Claim.objects.create(user=User.objects.create(email="ana@testorg.org"), organization=self.org, status=Claim.Status.ACTIVE)
        self.client.force_login(User.objects.get(email="ana@testorg.org"))

    def test_profile_saves_other_causes_and_the_api_lists_primary_first(self):
        res = save_all_sections(self.client, otherCauses=["civil-rights", "economy", "civil-rights"])
        self.assertEqual(res.status_code, 200, res.content)
        self.org.refresh_from_db()
        self.assertEqual(self.org.other_causes, ["civil-rights"])
        api = self.client.get("/api/organizations/test-org").json()
        self.assertEqual((api["cause"], api["causes"]), ("economy", ["economy", "civil-rights"]))
        form = self.client.get("/api/me/organizations/test-org/profile").json()
        self.assertEqual(form["values"]["otherCauses"], "civil-rights")

    def test_other_causes_are_optional_and_listings_have_causes(self):
        self.assertEqual(save_all_sections(self.client).status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.other_causes, [])
        self.assertEqual(self.client.get("/api/listings/test-org").json()["causes"], ["economy"])

    def test_an_unknown_cause_is_rejected(self):
        res = self.client.post("/api/me/organizations/test-org/profile/mission", profile_form(otherCauses=["made-up"]))
        self.assertEqual(res.status_code, 422)
        self.assertIn("otherCauses", res.json()["errors"])


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


@override_settings(STORAGES={"staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}})
class AdminPagesTests(TestCase):
    def setUp(self):
        self.client.force_login(User.objects.create_superuser("admin@findcauses.test", "a-long-test-password"))
        self.org = Organization.objects.create(slug="test-org", name="Test Org")
        IrsFiling.objects.create(organization=self.org, tax_year=2023, form_type="990")

    def test_organization_page_without_an_uploaded_990(self):
        res = self.client.get(f"/admin/directory/organization/{self.org.pk}/change/")
        self.assertEqual(res.status_code, 200)

    def test_organization_page_with_an_uploaded_990(self):
        Form990Upload.objects.create(organization=self.org, file_name="990.pdf", data=b"%PDF-1.4 test")
        res = self.client.get(f"/admin/directory/organization/{self.org.pk}/change/")
        self.assertContains(res, f"/admin/990/{self.org.pk}")

    def test_admin_saves_and_filters_several_causes(self):
        url = f"/admin/directory/organization/{self.org.pk}/change/"
        form = self.client.get(url).context["adminform"].form
        self.assertEqual([k for k, _ in form.fields["other_causes"].choices][:2], ["climate-change", "economy"])
        self.org.other_causes = ["economy"]
        self.org.cause = "climate-change"
        self.org.save()
        Organization.objects.create(slug="other", name="Other", cause="civil-rights")
        names = lambda res: [o.slug for o in res.context["cl"].result_list]  # noqa: E731
        self.assertEqual(names(self.client.get("/admin/directory/organization/?any_cause=economy")), ["test-org"])
        self.assertEqual(names(self.client.get("/admin/directory/organization/?any_cause=climate-change")), ["test-org"])
        self.assertEqual(names(self.client.get("/admin/directory/organization/?any_cause=civil-rights")), ["other"])

    def test_every_list_and_add_page_loads(self):
        for model in ["organization", "claim", "subscription"]:
            for page in ["", "add/"]:
                self.assertEqual(self.client.get(f"/admin/directory/{model}/{page}").status_code, 200, f"{model} {page}")
        self.assertEqual(self.client.get("/admin/accounts/user/").status_code, 200)
        user = User.objects.create(email="ana@gmail.com")
        claim = Claim.objects.create(user=user, organization=self.org, claimant_name="Ana", claimant_role="ED")
        self.assertEqual(self.client.get(f"/admin/directory/claim/{claim.pk}/change/").status_code, 200)
        self.assertEqual(self.client.get(f"/admin/accounts/user/{user.pk}/change/").status_code, 200)


@override_settings(EMAIL_DELIVERY="log", SITE_URL="http://testserver")
class ManageProfileTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(slug="test-org", name="Test Org", ein="660000001", mission="IRS mission", website="https://testorg.org")
        IrsFiling.objects.create(organization=self.org, tax_year=timezone.now().year - 2, form_type="990", total_revenue=5)
        self.user = User.objects.create(email="ana@testorg.org")
        self.claim = Claim.objects.create(user=self.user, organization=self.org, status=Claim.Status.ACTIVE)
        self.client.force_login(self.user)

    def save(self, section, **overrides):
        return self.client.post(f"/api/me/organizations/test-org/profile/{section}", profile_form(**overrides))

    def form(self):
        return self.client.get("/api/me/organizations/test-org/profile").json()

    def test_every_validation_error_belongs_to_a_section(self):
        errors = parse_profile({}, {}, new_organization=False, file_required=True).errors
        keys = {k for s in SECTIONS.values() for k in s.keys}
        self.assertEqual(set(errors) - keys, set())
        attrs = {a for s in SECTIONS.values() for a in s.fields}
        self.assertEqual(set(parse_profile({}, {}, new_organization=False, file_required=False).fields) - attrs, set())

    def test_a_fresh_page_has_nothing_complete(self):
        self.assertEqual(set(self.form()["sections"].values()), {False})

    def test_a_draft_stays_private_until_every_section_is_done(self):
        self.assertEqual(self.save("mission", mission="Draft mission").status_code, 200)
        form = self.form()
        self.assertTrue(form["sections"]["mission"])
        self.assertFalse(form["sections"]["basics"])
        self.assertEqual(form["values"]["mission"], "Draft mission")

        self.client.logout()
        listing = self.client.get("/api/listings/test-org").json()
        self.assertEqual(listing["mission"], "IRS mission")
        self.assertEqual(self.client.get("/api/organizations/test-org").status_code, 404)
        self.client.force_login(self.user)
        self.org.refresh_from_db()
        self.assertEqual(self.org.profile_status, Organization.Profile.NONE)

    def test_the_last_section_publishes_and_clears_the_draft(self):
        for name in SECTION_NAMES[:-1]:
            res = self.save(name, mission="Final mission")
            self.assertEqual(res.status_code, 200, res.content)
            self.assertFalse(res.json()["publishedNow"])
        with patch("directory.notifications.send") as send:
            User.objects.create_superuser("admin@findcauses.test", "a-long-test-password")
            res = self.save("contact")
        self.assertTrue(res.json()["publishedNow"])
        self.assertEqual(send.call_args.args[1], "Profile published: Test Org")
        self.org.refresh_from_db()
        self.assertEqual(self.org.profile_status, Organization.Profile.PUBLISHED)
        self.assertEqual(self.org.mission, "Final mission")
        self.assertEqual(self.org.profile_draft, {})
        self.assertEqual(self.client.get("/api/organizations/test-org").json()["mission"], "Final mission")
        self.assertEqual(set(self.form()["sections"].values()), {True})

    def test_an_invalid_section_saves_nothing_and_only_reports_its_own_errors(self):
        res = self.save("financials", totalExpenses="999", certify="")
        self.assertEqual(res.status_code, 422)
        self.assertEqual(set(res.json()["errors"]), {"programExpenses"})
        self.assertFalse(self.form()["sections"]["financials"])

    def test_certifying_is_required_for_a_new_profile(self):
        res = self.save("contact", certify="")
        self.assertIn("certify", res.json()["errors"])

    def test_once_published_a_section_goes_live_alone(self):
        save_all_sections(self.client)
        res = self.save("opportunities", fundingNeeds=json.dumps([{"title": "New need", "type": "program", "amount": "5000", "timeframe": "2028", "description": "D"}]))
        self.assertEqual(res.status_code, 200, res.content)
        self.assertFalse(res.json()["publishedNow"])
        api = self.client.get("/api/organizations/test-org").json()
        self.assertEqual([n["title"] for n in api["fundingNeeds"]], ["New need"])
        self.assertEqual(api["tagline"], "Tagline")
        self.assertEqual(len(api["board"]), 3)

    def test_a_published_profile_can_be_edited_without_certifying_again_elsewhere(self):
        save_all_sections(self.client)
        self.assertEqual(self.save("basics", tagline="Updated", certify="").status_code, 200)
        self.assertEqual(self.client.get("/api/organizations/test-org").json()["tagline"], "Updated")

    def test_uploading_a_990_marks_it_for_verifying(self):
        save_all_sections(self.client)
        Form990Upload.objects.create(organization=self.org, file_name="old.pdf", data=b"%PDF-1.4", verified_at=timezone.now())
        pdf = io.BytesIO(b"%PDF-1.4 new")
        pdf.name = "990.pdf"
        User.objects.create_superuser("admin@findcauses.test", "a-long-test-password")
        with patch("directory.notifications.send") as send:
            res = self.client.post("/api/me/organizations/test-org/profile/financials", {**profile_form(), "form990": pdf})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(send.call_args.args[1], "990 to verify: Test Org")
        upload = Form990Upload.objects.get(organization=self.org)
        self.assertEqual((upload.file_name, upload.verified_at), ("990.pdf", None))

    def test_a_profile_under_review_cant_be_edited(self):
        for status in (Organization.Profile.PENDING, Organization.Profile.REJECTED):
            Organization.objects.filter(pk=self.org.pk).update(profile_status=status)
            self.assertEqual(self.save("basics").status_code, 409)

    def test_an_unknown_section_is_404_and_others_cant_save(self):
        self.assertEqual(self.save("nope").status_code, 404)
        self.client.force_login(User.objects.create(email="other@gmail.com"))
        self.assertEqual(self.save("basics").status_code, 403)
        self.assertEqual(self.client.get("/api/me/organizations/test-org/profile").status_code, 403)


class ApplicationThresholdTests(TestCase):
    def errors(self, **overrides):
        data = {**profile_form(ein="66-0000002", irsRulingDate="2010-06"), **overrides}
        return parse_profile(data, {}, new_organization=True, file_required=False).errors

    def years_ago(self, years, months=0):
        today = timezone.now().date()
        total = today.year * 12 + today.month - 1 - years * 12 - months
        return f"{total // 12}-{total % 12 + 1:02d}"

    def test_a_qualifying_application_passes(self):
        self.assertEqual(self.errors(), {})

    def test_budget_tops_out_at_20_million(self):
        fits = {"totalRevenue": "20000000", "programExpenses": "20000000", "managementExpenses": "0", "fundraisingExpenses": "0", "totalExpenses": "20000000"}
        self.assertNotIn("totalExpenses", self.errors(**fits))
        over = {**fits, "totalRevenue": "20000001", "programExpenses": "20000001", "totalExpenses": "20000001"}
        self.assertIn("$20,000,000", self.errors(**over)["totalExpenses"])

    def test_irs_recognition_needs_at_least_10_years(self):
        self.assertNotIn("irsRulingDate", self.errors(irsRulingDate=self.years_ago(10)))
        self.assertIn("at least 10 years", self.errors(irsRulingDate=self.years_ago(9, 11))["irsRulingDate"])

    def test_a_missing_or_malformed_month_is_rejected(self):
        for bad in ("", "2010", "2010-13", "June 2010"):
            self.assertIn("irsRulingDate", self.errors(irsRulingDate=bad), bad)

    def test_organizations_already_listed_are_exempt(self):
        over = {"totalRevenue": "90000000", "programExpenses": "90000000", "managementExpenses": "0", "fundraisingExpenses": "0", "totalExpenses": "90000000"}
        errors = parse_profile({**profile_form(), **over}, {}, new_organization=False, file_required=False).errors
        self.assertEqual(errors, {})


class HiddenOrganizationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="ana@testorg.org")
        self.shown = Organization.objects.create(slug="shown", name="Shown", website="https://shown.org")
        self.hidden = Organization.objects.create(
            slug="hidden", name="Hidden", hidden=True, website="https://testorg.org", profile_status=Organization.Profile.PUBLISHED
        )

    def test_hidden_organizations_are_off_the_public_api(self):
        api = self.client.get("/api/directory").json()
        self.assertEqual([o["slug"] for o in api["listings"] + api["organizations"]], ["shown"])
        self.assertEqual(self.client.get("/api/listings/hidden").status_code, 404)
        self.assertEqual(self.client.get("/api/organizations/hidden").status_code, 404)
        Form990Upload.objects.create(organization=self.hidden, file_name="990.pdf", data=b"%PDF-1.4")
        self.assertEqual(self.client.get("/api/organizations/hidden/990").status_code, 404)

    def test_a_hidden_organization_cant_be_claimed(self):
        self.client.force_login(self.user)
        res = self.client.post("/api/listings/hidden/claim", {"name": "Ana", "role": "ED"}, content_type="application/json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Claim.objects.count(), 0)

    @override_settings(STORAGES={"staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}})
    def test_admin_can_show_and_hide(self):
        self.client.force_login(User.objects.create_superuser("admin@findcauses.test", "a-long-test-password"))
        self.assertEqual(self.client.get(f"/admin/directory/organization/{self.hidden.pk}/change/").status_code, 200)
        self.client.post("/admin/directory/organization/", {"action": "show", "_selected_action": [str(self.hidden.pk)]})
        self.assertEqual(self.client.get("/api/organizations/hidden").status_code, 200)
        self.client.post("/admin/directory/organization/", {"action": "hide", "_selected_action": [str(self.hidden.pk)]})
        self.assertEqual(self.client.get("/api/organizations/hidden").status_code, 404)

    def test_the_command_hides_only_what_misses_a_limit_and_needs_apply(self):
        year = timezone.now().year
        def org(slug, expenses, ruling_year):
            o = Organization.objects.create(slug=slug, name=slug, irs_ruling_date=date(ruling_year, 1, 1))
            IrsFiling.objects.create(organization=o, tax_year=2023, form_type="990", total_expenses=expenses)
            return o
        org("big", 20_000_001, 1990)
        org("young", 5_000_000, year - 5)
        org("young-no-figures", None, year - 5)
        org("exactly-20m", 20_000_000, 1990)
        org("no-figures", None, 1990)
        org("small", 100_000, 1990)
        names = lambda: set(Organization.objects.filter(hidden=True).values_list("slug", flat=True))  # noqa: E731
        out = io.StringIO()
        call_command("hide_outside_limits", stdout=out)
        self.assertIn("3 organizations would be hidden", out.getvalue())
        self.assertEqual(names(), {"hidden"})
        call_command("hide_outside_limits", "--apply", stdout=io.StringIO())
        self.assertEqual(names(), {"hidden", "big", "young", "young-no-figures"})


class LoadDirectoryTests(TestCase):
    def test_a_refresh_keeps_causes_and_websites_edited_by_hand(self):
        row = {
            "ein": "660000009", "slug": "org", "name": "New Name", "cause": "other", "city": "", "state": "PR", "mission": "",
            "tags": [], "website": "", "email": "", "phone": "", "irs_name": "", "irs_match_score": 95, "ntee_code": "",
            "irs_ruling_date": None, "filings": [],
        }  # fmt: skip
        Organization.objects.create(slug="org", name="Old Name", ein="660000009", cause="housing", other_causes=["education"], website="https://org.org")
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump({"organizations": [row, {**row, "ein": "660000010", "slug": "fresh", "cause": "economy"}]}, f)
            f.flush()
            call_command("load_directory", f.name, stdout=io.StringIO())
        org = Organization.objects.get(slug="org")
        self.assertEqual((org.name, org.cause, org.other_causes, org.website), ("New Name", "housing", ["education"], "https://org.org"))
        self.assertEqual(Organization.objects.get(slug="fresh").cause, "economy")


class DomainMatchTests(TestCase):
    def test_matches(self):
        self.assertTrue(email_matches_website("a@cne.org", "https://www.cne.org/about"))
        self.assertTrue(email_matches_website("a@mail.cne.org", "cne.org"))
        self.assertFalse(email_matches_website("a@gmail.com", "https://gmail.com"))
        self.assertFalse(email_matches_website("a@facebook.com", "https://facebook.com/someorg"))
        self.assertFalse(email_matches_website("a@other.org", "https://cne.org"))
        self.assertFalse(email_matches_website("a@cne.org", ""))
