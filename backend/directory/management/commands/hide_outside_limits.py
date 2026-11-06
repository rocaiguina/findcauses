from django.core.management.base import BaseCommand
from django.utils import timezone

from directory.models import Organization
from directory.profile_form import MID_SIZE_MAX_BUDGET, MIN_IRS_YEARS


class Command(BaseCommand):
    help = (
        "Hides organizations over the budget cap (newest filing) or with too few years of IRS recognition. "
        "Only ever hides, so anyone shown again in the admin stays shown unless it's rerun. Dry run without --apply."
    )

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Save the change.")

    def handle(self, apply, **options):
        today = timezone.now().date()
        hits = []
        for org in Organization.objects.filter(hidden=False).prefetch_related("filings"):
            newest = next(iter(org.filings.all()), None)
            expenses = newest.total_expenses if newest else None
            ruling = org.irs_ruling_date
            over = expenses is not None and expenses > MID_SIZE_MAX_BUDGET
            young = bool(ruling) and (today.year - ruling.year) * 12 + today.month - ruling.month < MIN_IRS_YEARS * 12
            if over or young:
                hits.append(org.pk)
                reasons = [f"${expenses:,} in expenses"] if over else []
                reasons += [f"IRS {ruling:%Y-%m}"] if young else []
                self.stdout.write(f"{org.name}: {', '.join(reasons)}")
        if apply:
            Organization.objects.filter(pk__in=hits).update(hidden=True)
        self.stdout.write(self.style.SUCCESS(f"{len(hits)} organizations {'hidden' if apply else 'would be hidden'}"))
