import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from directory.models import IrsFiling, Organization

FILING_FIELDS = [
    "form_type",
    "total_revenue",
    "total_expenses",
    "contributions",
    "program_revenue",
    "total_assets",
    "total_liabilities",
    "net_assets",
]


# Set when an organization is created, then kept: we correct these by hand, and a refresh mustn't undo that.
EDITED_HERE = {"cause", "website"}


class Command(BaseCommand):
    help = "Loads (or refreshes) organizations and their IRS filings from a JSON file. Profiles, claims, causes and websites are untouched."

    def add_arguments(self, parser):
        parser.add_argument("path", type=Path, help="JSON file: {organizations: [{..., filings: [...]}]}")

    @transaction.atomic
    def handle(self, path, **options):
        rows = json.loads(path.read_text())["organizations"]
        # An EIN belongs to one organization; when two names matched the same EIN, keep the stronger match.
        best = {}
        for row in rows:
            key = row["ein"] or row["slug"]
            if key not in best or (row["irs_match_score"] or 0) > (best[key]["irs_match_score"] or 0):
                best[key] = row

        # Bulk writes: a few queries in all, so it's quick against a remote database.
        existing = {o.ein: o for o in Organization.objects.filter(ein__in=[r["ein"] for r in best.values()])}
        new, changed = [], []
        for row in best.values():
            values = {
                "slug": row["slug"],
                "name": row["name"],
                "cause": row["cause"],
                "city": row["city"] or "",
                "state": row["state"] or "PR",
                "mission": row["mission"] or "",
                "tags": row["tags"] or [],
                "website": row["website"] or "",
                "email": row["email"] or "",
                "phone": row["phone"] or "",
                "irs_name": row["irs_name"] or "",
                "irs_match_score": row["irs_match_score"],
                "ntee_code": row["ntee_code"] or "",
                "irs_ruling_date": row["irs_ruling_date"],
            }
            if row["ein"] in existing:
                org = existing[row["ein"]]
                for k, v in values.items():
                    if k not in EDITED_HERE:
                        setattr(org, k, v)
                changed.append(org)
            else:
                new.append(Organization(ein=row["ein"], **values))
        Organization.objects.bulk_create(new, batch_size=200)
        Organization.objects.bulk_update(changed, [k for k in values if k not in EDITED_HERE], batch_size=200)
        created, updated = len(new), len(changed)

        by_ein = {o.ein: o for o in [*new, *changed]}
        IrsFiling.objects.filter(organization__in=by_ein.values()).delete()
        filings = IrsFiling.objects.bulk_create(
            [
                IrsFiling(
                    organization=by_ein[row["ein"]],
                    tax_year=f["tax_year"],
                    pdf_url=f["pdf_url"] or "",
                    **{k: f[k] for k in FILING_FIELDS},
                )
                for row in best.values()
                for f in {f["tax_year"]: f for f in row["filings"]}.values()
            ],
            batch_size=500,
        )
        filings = len(filings)

        skipped = len(rows) - len(best)
        self.stdout.write(
            self.style.SUCCESS(
                f"{created} organizations created, {updated} updated, {filings} filings loaded"
                + (f", {skipped} duplicate EIN match skipped" if skipped else "")
            )
        )
