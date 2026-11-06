import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

CAUSES = [
    ("climate-change", "Climate Change"),
    ("economy", "Economy"),
    ("fiscal-policy", "Fiscal Policy"),
    ("civil-rights", "Civil Rights"),
    ("energy-infrastructure", "Energy & Infrastructure"),
    ("arts-culture", "Arts & Culture"),
    ("recreation-sports", "Recreation & Sports"),
    ("public-health", "Public Health"),
    ("education", "Education"),
    ("housing", "Housing"),
    ("disaster-relief", "Disaster Relief"),
    ("social-services", "Social Services"),
    ("other", "Other"),
]

FUNDING_TYPES = [
    ("general_operating", "General operating support"),
    ("program", "Program or project"),
    ("capital", "Capital (building, equipment)"),
    ("capacity", "Capacity building"),
    ("emergency", "Emergency or disaster response"),
]

# A Form 990 counts as recent when it covers one of the last three tax years (filings lag the year by 1–2 years).
RECENT_990_YEARS = 3


def recent_990_cutoff() -> int:
    return timezone.now().year - RECENT_990_YEARS


class Organization(models.Model):
    """
    One nonprofit, and its public page. Every organization we list starts from IRS data. Once someone from the
    organization claims it and publishes a full profile, the page shows that profile instead.
    """

    class Profile(models.TextChoices):
        NONE = "none", "No profile yet"
        PENDING = "pending", "Submitted, awaiting review"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=200)
    cause = models.CharField("primary cause", max_length=40, choices=CAUSES, default="other")
    other_causes = models.JSONField(default=list, blank=True, help_text="Causes besides the primary one.")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, default="PR")
    mission = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True, help_text="Short topic labels, e.g. Youth, Housing.")
    website = models.URLField(max_length=300, blank=True)
    email = models.EmailField(blank=True, help_text="Public contact email.")
    phone = models.CharField(max_length=40, blank=True)

    # From IRS records (via ProPublica Nonprofit Explorer).
    ein = models.CharField("EIN", max_length=9, unique=True, null=True, blank=True, help_text="Nine digits, no dash.")
    irs_name = models.CharField("IRS name", max_length=200, blank=True)
    irs_match_score = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Name match 0–100.")
    ntee_code = models.CharField("NTEE code", max_length=10, blank=True)
    irs_ruling_date = models.DateField("IRS ruling date", null=True, blank=True)

    # The full profile, written by the organization.
    profile_status = models.CharField(max_length=10, choices=Profile.choices, default=Profile.NONE)
    hidden = models.BooleanField(default=False, help_text="Off the public site and can't be claimed. Nothing is deleted.")
    tagline = models.CharField(max_length=160, blank=True)
    year_founded = models.PositiveSmallIntegerField(null=True, blank=True)
    geographic_scope = models.CharField(max_length=200, blank=True)
    focus_areas = models.JSONField(default=list, blank=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_title = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    independent_audit = models.BooleanField(null=True, blank=True)
    auditor = models.CharField(max_length=300, blank=True)
    conflict_of_interest_policy = models.BooleanField(null=True, blank=True)
    whistleblower_policy = models.BooleanField(null=True, blank=True)
    document_retention_policy = models.BooleanField(null=True, blank=True)
    funder_reporting = models.TextField(blank=True)
    impact_measurement = models.TextField(blank=True)
    restricted_funds = models.TextField(blank=True)
    profile_draft = models.JSONField(
        default=dict, blank=True, help_text="Sections saved so far, in the form's own values. Private until the profile is complete."
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["profile_status", "cause"])]

    def __str__(self):
        return self.name

    @property
    def causes(self) -> list[str]:
        """Every cause, primary first."""
        return [self.cause, *(c for c in self.other_causes if c != self.cause)]

    @property
    def has_profile(self) -> bool:
        return self.profile_status == self.Profile.PUBLISHED

    # --- FindCauses Certified: claimed + published profile + recent 990. Checked live, so it lapses on its own.

    def certified_check(self) -> dict:
        cutoff = recent_990_cutoff()
        recent_irs = any(f.tax_year >= cutoff for f in self.filings.all())
        upload = getattr(self, "form990", None)
        latest = max((f.fiscal_year for f in self.financials.all()), default="")
        recent_upload = bool(upload and upload.verified_at and latest[:4].isdigit() and int(latest[:4]) >= cutoff)
        return {
            "claimed": any(c.status == Claim.Status.ACTIVE for c in self.claims.all()),
            "profile": self.has_profile,
            "recent990": recent_irs or recent_upload,
        }

    @property
    def is_certified(self) -> bool:
        return all(self.certified_check().values())


class IrsFiling(models.Model):
    """Form 990 summary figures from IRS data, one row per tax year."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="filings")
    tax_year = models.PositiveSmallIntegerField()
    form_type = models.CharField(max_length=10)
    total_revenue = models.BigIntegerField(null=True, blank=True)
    total_expenses = models.BigIntegerField(null=True, blank=True)
    contributions = models.BigIntegerField(null=True, blank=True)
    program_revenue = models.BigIntegerField(null=True, blank=True)
    total_assets = models.BigIntegerField(null=True, blank=True)
    total_liabilities = models.BigIntegerField(null=True, blank=True)
    net_assets = models.BigIntegerField(null=True, blank=True)
    pdf_url = models.URLField(max_length=500, blank=True)

    class Meta:
        ordering = ["-tax_year"]
        constraints = [models.UniqueConstraint(fields=["organization", "tax_year"], name="one_filing_per_year")]

    def __str__(self):
        return f"{self.tax_year} {self.form_type}"


class Financials(models.Model):
    """Figures the organization entered from its most recent Form 990 (Part I), checked against the upload."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="financials")
    fiscal_year = models.CharField(max_length=9)
    total_revenue = models.BigIntegerField()
    contributions = models.BigIntegerField()
    program_revenue = models.BigIntegerField()
    total_expenses = models.BigIntegerField()
    program_expenses = models.BigIntegerField()
    management_expenses = models.BigIntegerField()
    fundraising_expenses = models.BigIntegerField()
    total_assets = models.BigIntegerField()
    net_assets = models.BigIntegerField()
    employees = models.PositiveIntegerField()
    volunteers = models.PositiveIntegerField()

    class Meta:
        verbose_name_plural = "financials"
        ordering = ["-fiscal_year"]

    def __str__(self):
        return f"FY{self.fiscal_year}"


class Form990Upload(models.Model):
    """The organization's uploaded Form 990 PDF, kept in the database. An admin verifies it against the figures."""

    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name="form990")
    file_name = models.CharField(max_length=255)
    data = models.BinaryField()
    uploaded_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Form 990 upload"

    def __str__(self):
        return self.file_name


class Section(models.Model):
    """A row in one of the profile's repeatable sections, kept in the order the organization entered it."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="%(class)ss")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["position"]


class BoardMember(Section):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    affiliation = models.CharField(max_length=300)


class Milestone(Section):
    year = models.CharField(max_length=20)
    title = models.CharField(max_length=300)
    description = models.TextField()


class ImpactMetric(Section):
    label = models.CharField(max_length=300)
    value = models.CharField(max_length=100)


class NetworkTie(Section):
    name = models.CharField(max_length=300)
    type = models.CharField(max_length=200)
    description = models.TextField()


class RoadmapItem(Section):
    timeframe = models.CharField(max_length=100)
    goal = models.CharField(max_length=300)
    description = models.TextField()


class FundingNeed(Section):
    """An impact opportunity the organization is seeking funding for."""

    title = models.CharField(max_length=300)
    type = models.CharField(max_length=30, choices=FUNDING_TYPES)
    amount = models.BigIntegerField(null=True, blank=True, help_text="Dollars sought; empty if not stated.")
    timeframe = models.CharField(max_length=100, blank=True)
    description = models.TextField()


class Claim(models.Model):
    """
    A person managing an organization's page. Verified instantly when they sign in with an email on the
    organization's website domain; otherwise an admin reviews it.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"

    class Method(models.TextChoices):
        DOMAIN = "domain", "Email on the organization's domain"
        REVIEW = "review", "Reviewed by an admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="claims")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="claims")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    method = models.CharField(max_length=10, choices=Method.choices)
    claimant_name = models.CharField(max_length=200)
    claimant_role = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "organization"], name="one_claim_per_person")]

    def __str__(self):
        return f"{self.user} → {self.organization}"


class Subscription(models.Model):
    """A funder asking to be emailed new opportunities that match their answers (the results URL query)."""

    email = models.EmailField()
    query = models.CharField(max_length=1000)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["email", "query"], name="one_subscription_per_query")]

    def __str__(self):
        return self.email
