"""
JSON shapes for the Next.js site, matching its TypeScript types (src/lib/types.ts): `ImportedListing` for an
organization's page built from IRS data, `Organization` for a published full profile.
"""

from django.db.models import Prefetch

from .models import Claim, Organization


def with_related(queryset):
    """Prefetches everything the serializers and the Certified check read."""
    return queryset.select_related("form990").prefetch_related(
        "filings",
        "financials",
        "boardmembers",
        "milestones",
        "impactmetrics",
        "networkties",
        "roadmapitems",
        "fundingneeds",
        Prefetch("claims", queryset=Claim.objects.only("id", "organization_id", "status")),
    )


def _date(d):
    return d.isoformat() if d else None


def _needs(org):
    return [
        {"title": n.title, "type": n.type, "amount": n.amount, "timeframe": n.timeframe or None, "description": n.description}
        for n in org.fundingneeds.all()
    ]


def _standing(org):
    check = org.certified_check()
    return {"check": check, "claimed": check["claimed"], "certified": all(check.values())}


def listing(org: Organization) -> dict:
    return {
        "id": str(org.id),
        "slug": org.slug,
        "name": org.name,
        "city": org.city or None,
        "state": org.state,
        "cause": org.cause,
        "tags": org.tags,
        "mission": org.mission or None,
        "website": org.website or None,
        "email": org.email or None,
        "phone": org.phone or None,
        "ein": org.ein,
        "irsName": org.irs_name or None,
        "irsMatchScore": org.irs_match_score,
        "nteeCode": org.ntee_code or None,
        "irsRulingDate": _date(org.irs_ruling_date),
        "needs": _needs(org),
        "filings": [
            {
                "taxYear": f.tax_year,
                "formType": f.form_type,
                "totalRevenue": f.total_revenue,
                "totalExpenses": f.total_expenses,
                "contributions": f.contributions,
                "programRevenue": f.program_revenue,
                "totalAssets": f.total_assets,
                "totalLiabilities": f.total_liabilities,
                "netAssets": f.net_assets,
                "pdfUrl": f.pdf_url or None,
            }
            for f in org.filings.all()
        ],
        "profileSlug": org.slug if org.has_profile else None,
        **_standing(org),
    }


def _ein(org):
    return f"{org.ein[:2]}-{org.ein[2:]}" if org.ein and len(org.ein) == 9 else (org.ein or "")


def profile(org: Organization) -> dict:
    fin = next(iter(org.financials.all()), None)
    upload = getattr(org, "form990", None)
    status = {"published": "approved", "pending": "pending", "rejected": "rejected"}.get(org.profile_status, "pending")
    return {
        "id": str(org.id),
        "slug": org.slug,
        "status": status,
        "submittedAt": (org.submitted_at or org.created_at).isoformat(),
        "reviewedAt": org.reviewed_at.isoformat() if org.reviewed_at else None,
        "name": org.name,
        "tagline": org.tagline,
        "ein": _ein(org),
        "website": org.website,
        "city": org.city,
        "state": org.state,
        "yearFounded": org.year_founded,
        "geographicScope": org.geographic_scope,
        "contact": {
            "name": org.contact_name,
            "title": org.contact_title,
            "email": org.contact_email,
            "phone": org.contact_phone,
        },
        "cause": org.cause,
        "focusAreas": org.focus_areas,
        "mission": org.mission,
        "impactMetrics": [{"label": m.label, "value": m.value} for m in org.impactmetrics.all()],
        "trackRecord": [{"year": m.year, "title": m.title, "description": m.description} for m in org.milestones.all()],
        "networks": [{"name": n.name, "type": n.type, "description": n.description} for n in org.networkties.all()],
        "roadmap": [{"timeframe": r.timeframe, "goal": r.goal, "description": r.description} for r in org.roadmapitems.all()],
        "board": [{"name": b.name, "role": b.role, "affiliation": b.affiliation} for b in org.boardmembers.all()],
        "fundingNeeds": _needs(org),
        "financials": {
            "fiscalYear": fin.fiscal_year,
            "totalRevenue": fin.total_revenue,
            "contributions": fin.contributions,
            "programRevenue": fin.program_revenue,
            "totalExpenses": fin.total_expenses,
            "programExpenses": fin.program_expenses,
            "managementExpenses": fin.management_expenses,
            "fundraisingExpenses": fin.fundraising_expenses,
            "totalAssets": fin.total_assets,
            "netAssets": fin.net_assets,
            "employees": fin.employees,
            "volunteers": fin.volunteers,
        }
        if fin
        else None,
        "stewardship": {
            "independentAudit": bool(org.independent_audit),
            "auditor": org.auditor,
            "conflictOfInterestPolicy": bool(org.conflict_of_interest_policy),
            "whistleblowerPolicy": bool(org.whistleblower_policy),
            "documentRetentionPolicy": bool(org.document_retention_policy),
            "funderReporting": org.funder_reporting,
            "impactMeasurement": org.impact_measurement,
            "restrictedFunds": org.restricted_funds,
        },
        "irsRulingDate": _date(org.irs_ruling_date),
        "form990": {"fileName": upload.file_name} if upload else None,
        "form990VerifiedAt": upload.verified_at.isoformat() if upload and upload.verified_at else None,
        "irsFilings": listing(org)["filings"],
        **_standing(org),
    }


def form_values(org: Organization) -> dict:
    """The profile as the form's field values, for prefilling an edit (or a first profile from IRS data)."""
    fin = next(iter(org.financials.all()), None)
    yes_no = lambda v: "" if v is None else ("yes" if v else "no")  # noqa: E731
    values = {
        "name": org.name,
        "tagline": org.tagline,
        "ein": _ein(org),
        "website": org.website,
        "city": org.city,
        "state": org.state,
        "yearFounded": str(org.year_founded or ""),
        "geographicScope": org.geographic_scope,
        "cause": org.cause,
        "focusAreas": ", ".join(org.focus_areas or org.tags),
        "mission": org.mission,
        "contactName": org.contact_name,
        "contactTitle": org.contact_title,
        "contactEmail": org.contact_email,
        "contactPhone": org.contact_phone,
        "independentAudit": yes_no(org.independent_audit),
        "auditor": org.auditor,
        "conflictOfInterestPolicy": yes_no(org.conflict_of_interest_policy),
        "whistleblowerPolicy": yes_no(org.whistleblower_policy),
        "documentRetentionPolicy": yes_no(org.document_retention_policy),
        "funderReporting": org.funder_reporting,
        "impactMeasurement": org.impact_measurement,
        "restrictedFunds": org.restricted_funds,
    }
    if fin:
        values.update(
            {
                "fiscalYear": fin.fiscal_year,
                "totalRevenue": str(fin.total_revenue),
                "contributions": str(fin.contributions),
                "programRevenue": str(fin.program_revenue),
                "totalExpenses": str(fin.total_expenses),
                "programExpenses": str(fin.program_expenses),
                "managementExpenses": str(fin.management_expenses),
                "fundraisingExpenses": str(fin.fundraising_expenses),
                "totalAssets": str(fin.total_assets),
                "netAssets": str(fin.net_assets),
                "employees": str(fin.employees),
                "volunteers": str(fin.volunteers),
            }
        )
    else:
        # Start from the latest IRS figures the organization can confirm or correct.
        latest = next(iter(org.filings.all()), None)
        if latest:
            values.update(
                {
                    "fiscalYear": str(latest.tax_year),
                    "totalRevenue": str(latest.total_revenue or ""),
                    "contributions": str(latest.contributions or ""),
                    "programRevenue": str(latest.program_revenue or ""),
                    "totalExpenses": str(latest.total_expenses or ""),
                    "totalAssets": str(latest.total_assets or ""),
                    "netAssets": str(latest.net_assets or ""),
                }
            )
    lists = {
        "impactMetrics": [{"value": m.value, "label": m.label} for m in org.impactmetrics.all()],
        "trackRecord": [{"year": m.year, "title": m.title, "description": m.description} for m in org.milestones.all()],
        "networks": [{"name": n.name, "type": n.type, "description": n.description} for n in org.networkties.all()],
        "roadmap": [{"timeframe": r.timeframe, "goal": r.goal, "description": r.description} for r in org.roadmapitems.all()],
        "board": [{"name": b.name, "role": b.role, "affiliation": b.affiliation} for b in org.boardmembers.all()],
        "fundingNeeds": [
            {
                "title": n.title,
                "type": n.type,
                "amount": "" if n.amount is None else str(n.amount),
                "timeframe": n.timeframe,
                "description": n.description,
            }
            for n in org.fundingneeds.all()
        ],
    }
    return {"values": values, "lists": lists, "hasForm990": bool(getattr(org, "form990", None))}
