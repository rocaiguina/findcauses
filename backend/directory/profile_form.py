"""
Validates the full-profile form the Next.js site posts (the same fields for a new application and for an
organization completing or editing its claimed page, a section at a time). Error keys match the form's field names.
"""

import json
import re
from dataclasses import dataclass, field
from datetime import date

from django.conf import settings
from django.utils import timezone

from .models import CAUSES, FUNDING_TYPES

MID_SIZE_MIN_BUDGET = 1_000_000
MID_SIZE_MAX_BUDGET = 20_000_000
MIN_IRS_YEARS = 10
STATES = (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM "
    "NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY"
).split()
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

NUMBER_FIELDS = {
    "totalRevenue": "total_revenue",
    "contributions": "contributions",
    "programRevenue": "program_revenue",
    "totalExpenses": "total_expenses",
    "programExpenses": "program_expenses",
    "managementExpenses": "management_expenses",
    "fundraisingExpenses": "fundraising_expenses",
    "totalAssets": "total_assets",
    "netAssets": "net_assets",
    "employees": "employees",
    "volunteers": "volunteers",
}

# Repeatable sections: form key → (row keys, minimum rows, label used in messages).
LISTS = {
    "impactMetrics": (["label", "value"], 2, "impact metrics"),
    "trackRecord": (["year", "title", "description"], 2, "track record milestones"),
    "networks": (["name", "type", "description"], 1, "networks or partners"),
    "roadmap": (["timeframe", "goal", "description"], 2, "roadmap goals"),
    "board": (["name", "role", "affiliation"], 3, "board members"),
}

YES_NO = {
    "independentAudit": ("independent_audit", "independent audit"),
    "conflictOfInterestPolicy": ("conflict_of_interest_policy", "conflict of interest policy"),
    "whistleblowerPolicy": ("whistleblower_policy", "whistleblower policy"),
    "documentRetentionPolicy": ("document_retention_policy", "document retention policy"),
}


@dataclass(frozen=True)
class Section:
    """One part of the profile that an organization saves on its own."""

    keys: tuple  # Form field names, which are also the error keys.
    fields: tuple = ()  # Organization attributes it writes.
    lists: tuple = ()  # Repeatable lists it writes.
    financials: bool = False
    needs: bool = False


SECTIONS = {
    "basics": Section(
        ("name", "tagline", "ein", "website", "city", "state", "yearFounded", "geographicScope"),
        fields=("name", "tagline", "website", "city", "state", "year_founded", "geographic_scope"),
    ),
    "mission": Section(
        ("cause", "otherCauses", "focusAreas", "mission", "impactMetrics"),
        fields=("cause", "other_causes", "focus_areas", "mission"),
        lists=("impactMetrics",),
    ),
    "track-record": Section(
        ("trackRecord", "networks", "roadmap"),
        lists=("trackRecord", "networks", "roadmap"),
    ),
    "opportunities": Section(("fundingNeeds",), needs=True),
    "financials": Section(("fiscalYear", *NUMBER_FIELDS, "form990"), financials=True),
    "governance": Section(
        ("board", *YES_NO, "auditor", "funderReporting", "impactMeasurement", "restrictedFunds"),
        fields=(
            *(attr for attr, _ in YES_NO.values()),
            "auditor",
            "funder_reporting",
            "impact_measurement",
            "restricted_funds",
        ),
        lists=("board",),
    ),
    "contact": Section(
        ("contactName", "contactTitle", "contactEmail", "contactPhone", "certify"),
        fields=("contact_name", "contact_title", "contact_email", "contact_phone"),
    ),
}
LIST_KEYS = (*LISTS, "fundingNeeds")


def submit_section(form: dict, section: str, data) -> None:
    """Copies one section's submitted values into the form's values and lists."""
    for key in SECTIONS[section].keys:
        if key in LIST_KEYS:
            form["lists"][key] = _json_rows(data.get(key))
        elif key == "otherCauses":
            form["values"][key] = ",".join(data.getlist(key) if hasattr(data, "getlist") else data.get(key, []))
        elif key != "form990":
            form["values"][key] = str(data.get(key, ""))


def parse_form(form: dict, files, *, certified: bool) -> "ParsedProfile":
    """Validates a whole profile held as form values. `certified`: already attested, so it isn't asked again."""
    data = {**form["values"], **{k: json.dumps(v) for k, v in form["lists"].items()}}
    data["otherCauses"] = [c for c in form["values"].get("otherCauses", "").split(",") if c]
    if certified:
        data["certify"] = "on"
    return parse_profile(data, files, new_organization=False, file_required=False)


def section_status(form: dict, *, certified: bool) -> dict:
    """Which sections are complete, as {section: bool}."""
    errors = parse_form(form, {}, certified=certified).errors
    return {name: not any(k in errors for k in s.keys) for name, s in SECTIONS.items()}


@dataclass
class ParsedProfile:
    fields: dict = field(default_factory=dict)
    financials: dict = field(default_factory=dict)
    lists: dict = field(default_factory=dict)
    needs: list = field(default_factory=list)
    ein: str = ""
    irs_ruling_date: object = None
    file: object = None
    errors: dict = field(default_factory=dict)


def parse_profile(data, files, *, new_organization: bool, file_required: bool) -> ParsedProfile:
    p = ParsedProfile()
    e = p.errors

    def text(key, label, max_len=2000):
        v = str(data.get(key, "")).strip()
        if not v:
            e[key] = f"{label} is required."
        elif len(v) > max_len:
            e[key] = f"{label} must be under {max_len} characters."
        return v

    f = p.fields
    f["name"] = text("name", "Organization name", 200)
    f["tagline"] = text("tagline", "One-line summary", 160)
    ein = text("ein", "EIN", 10)
    if ein and not re.fullmatch(r"\d{2}-\d{7}", ein):
        e["ein"] = "EIN must look like 12-3456789."
    p.ein = ein.replace("-", "")
    f["website"] = text("website", "Website", 300)
    if f["website"] and not re.match(r"^https?://\S+\.\S+", f["website"]):
        e["website"] = "Website must start with http:// or https://."
    f["city"] = text("city", "City", 100)
    f["state"] = text("state", "State", 2)
    if f["state"] and f["state"] not in STATES:
        e["state"] = "Choose a U.S. state or territory."
    year = text("yearFounded", "Year founded", 4)
    f["year_founded"] = int(year) if year.isdigit() else None
    if year and not (f["year_founded"] and 1800 <= f["year_founded"] <= timezone.now().year):
        e["yearFounded"] = "Enter a valid founding year."
    f["geographic_scope"] = text("geographicScope", "Geographic scope", 200)
    f["contact_name"] = text("contactName", "Contact name", 120)
    f["contact_title"] = text("contactTitle", "Contact title", 120)
    f["contact_email"] = text("contactEmail", "Contact email", 200)
    if f["contact_email"] and not EMAIL.match(f["contact_email"]):
        e["contactEmail"] = "Enter a valid email."
    f["contact_phone"] = text("contactPhone", "Contact phone", 40)
    f["cause"] = text("cause", "Primary cause", 40)
    if f["cause"] and f["cause"] not in dict(CAUSES):
        e["cause"] = "Choose one of the listed causes."
    others = data.getlist("otherCauses") if hasattr(data, "getlist") else data.get("otherCauses", [])
    if any(c not in dict(CAUSES) for c in others):
        e["otherCauses"] = "Choose from the listed causes."
    f["other_causes"] = [c for c in dict.fromkeys(others) if c != f["cause"]]
    f["focus_areas"] = [s.strip() for s in text("focusAreas", "Focus areas", 300).split(",") if s.strip()][:6]
    f["mission"] = text("mission", "Mission statement", 1200)

    for key, (attr, label) in YES_NO.items():
        v = data.get(key)
        if v not in ("yes", "no"):
            e[key] = f"Answer yes or no: {label}."
        f[attr] = v == "yes"
    f["auditor"] = text("auditor", "Auditor (or explanation)", 300)
    f["funder_reporting"] = text("funderReporting", "Reporting to funders", 800)
    f["impact_measurement"] = text("impactMeasurement", "Impact measurement", 800)
    f["restricted_funds"] = text("restrictedFunds", "Restricted funds policy", 800)

    fin = p.financials
    fin["fiscal_year"] = text("fiscalYear", "Fiscal year", 4)
    if fin["fiscal_year"] and not re.fullmatch(r"\d{4}", fin["fiscal_year"]):
        e["fiscalYear"] = "Enter the 4-digit fiscal year."
    for key, attr in NUMBER_FIELDS.items():
        raw = re.sub(r"[$,\s]", "", str(data.get(key, "")))
        try:
            n = round(float(raw))
        except ValueError:
            n = None
        if not raw:
            e[key] = "Required."
        elif n is None or (key != "netAssets" and n < 0):
            e[key] = "Enter a valid amount."
        fin[attr] = n or 0

    # Organizations already in the directory are exempt; new applicants must be mid-size and established.
    if new_organization and "totalExpenses" not in e:
        if not MID_SIZE_MIN_BUDGET <= fin["total_expenses"] <= MID_SIZE_MAX_BUDGET:
            e["totalExpenses"] = "FindCauses lists mid-size nonprofits with total expenses between $1,000,000 and $20,000,000."
    if new_organization:
        _check_irs_ruling(p, data.get("irsRulingDate", ""))
    functional = fin["program_expenses"] + fin["management_expenses"] + fin["fundraising_expenses"]
    if "programExpenses" not in e and abs(functional - fin["total_expenses"]) > fin["total_expenses"] * 0.01:
        e["programExpenses"] = "Program + management + fundraising should add up to total expenses (990 Part IX, line 25)."
    if "contributions" not in e and fin["contributions"] + fin["program_revenue"] > fin["total_revenue"]:
        e["contributions"] = "Contributions plus program revenue can't exceed total revenue."

    for key, (keys, minimum, label) in LISTS.items():
        rows = _json_rows(data.get(key))[:25]
        clean = [{k: str((r or {}).get(k, "")).strip()[:600] for k in keys} for r in rows]
        if len(clean) < minimum:
            e[key] = f"Add at least {minimum} {label}."
        elif any(not r[k] for r in clean for k in keys):
            e[key] = f"Fill in every field for each of your {label}."
        p.lists[key] = clean

    types = dict(FUNDING_TYPES)
    for r in _json_rows(data.get("fundingNeeds"))[:10]:
        r = r or {}
        try:
            amount = round(float(re.sub(r"[$,\s]", "", str(r.get("amount", "")))))
        except ValueError:
            amount = None
        p.needs.append(
            {
                "title": str(r.get("title", "")).strip()[:300],
                "type": str(r.get("type", "")).strip(),
                "amount": amount,
                "timeframe": str(r.get("timeframe", "")).strip()[:100],
                "description": str(r.get("description", "")).strip()[:600],
            }
        )
    if not p.needs:
        e["fundingNeeds"] = "Add at least 1 impact opportunity."
    elif any(not n["title"] or not n["timeframe"] or not n["description"] for n in p.needs):
        e["fundingNeeds"] = "Fill in every field for each impact opportunity."
    elif any(n["type"] not in types for n in p.needs):
        e["fundingNeeds"] = "Choose a funding type for each opportunity."
    elif any(n["amount"] is None or n["amount"] <= 0 for n in p.needs):
        e["fundingNeeds"] = "Enter the amount sought, in dollars, for each impact opportunity."

    upload = files.get("form990")
    if upload and upload.size:
        if upload.size > settings.MAX_990_BYTES:
            e["form990"] = "The 990 PDF must be under 20 MB."
        elif not upload.name.lower().endswith(".pdf"):
            e["form990"] = "The 990 must be a PDF file."
        else:
            head = upload.read(5)
            upload.seek(0)
            if head != b"%PDF-":
                e["form990"] = "That file doesn't look like a valid PDF."
            p.file = upload
    elif file_required:
        e["form990"] = "Upload your most recent Form 990 as a PDF."

    if data.get("certify") != "on":
        e["certify"] = "You must certify that the information is accurate."
    return p


def _check_irs_ruling(p: ParsedProfile, raw) -> None:
    """A "YYYY-MM" month, at least MIN_IRS_YEARS ago to the month."""
    match = re.fullmatch(r"(\d{4})-(\d{2})", str(raw).strip())
    if not match or not 1 <= int(match[2]) <= 12 or int(match[1]) < 1900:
        p.errors["irsRulingDate"] = "Enter the month the IRS recognized your tax-exempt status, like 2010-06."
        return
    ruling = date(int(match[1]), int(match[2]), 1)
    today = timezone.now().date()
    if (today.year - ruling.year) * 12 + today.month - ruling.month < MIN_IRS_YEARS * 12:
        p.errors["irsRulingDate"] = f"FindCauses lists organizations recognized by the IRS for at least {MIN_IRS_YEARS} years."
    p.irs_ruling_date = ruling


def _json_rows(raw):
    try:
        rows = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return rows if isinstance(rows, list) else []
