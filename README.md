# JustCause

A directory of mid-size U.S. nonprofits ($1M–$50M in annual expenses per Form 990) built for funders —
individual donors, foundations and corporate givers.

Each profile covers mission and focus areas, impact metrics, track record, networks, roadmap, Form 990
financials, board of directors and stewardship. Organizations are grouped into twelve causes: Climate Change,
Economy, Fiscal Policy, Civil Rights, Energy & Infrastructure, Arts & Culture, Recreation & Sports, Public Health,
Education, Housing, Disaster Relief, and Other (see `src/lib/causes.ts`).

## Running locally

Requires Node 20+ and Postgres 14+ (e.g. `brew install postgresql@16`).

```bash
npm install
createdb justcause
cp .env.example .env.local   # then set DATABASE_URL and ADMIN_PASSWORD
npm run db:migrate           # create tables
npm run dev
```

## Database

Postgres via [Drizzle ORM](https://orm.drizzle.team). Schema lives in `src/db/schema.ts`; SQL migrations
are generated into `drizzle/` and should be committed.

| Table | Holds |
| --- | --- |
| `organizations` | Identity, contact, cause, mission, stewardship answers, review status |
| `financials` | Form 990 figures, one row per fiscal year (profiles show the latest) |
| `form990_files` | The uploaded 990 PDF (kept separate so listings never load file bytes) |
| `board_members`, `milestones`, `impact_metrics`, `network_ties`, `roadmap_items` | Repeatable profile sections, ordered by `position` |

A partial unique index allows one active (pending or approved) listing per EIN; rejected organizations can
reapply. Deleting an organization cascades to all of its rows.

```bash
npm run db:generate   # after editing schema.ts — writes a new migration
npm run db:migrate    # apply pending migrations
npm run db:studio     # browse data
```

## Imported listings (development only)

To have real organizations to work with, the directory also shows **unclaimed listings** imported from
two Puerto Rico directories, the
[Pecunia Group directory](https://pecuniagroup.com/es/directorio-osfl/) and the
[Observatorio de Datos](https://observatoriodedatos.org/directorio-entidades). Each listing is enriched
with Form 990 summary figures from IRS data via
[ProPublica Nonprofit Explorer](https://projects.propublica.org/nonprofits/api).

They live in their own tables (`imported_orgs`, `irs_filings`), appear with an "Unclaimed" badge and a
dashed card, and link to `/listings/[slug]`. Source snapshots and the ProPublica response cache are in
`data/imports/` (gitignored).

```bash
npm run imports:load     # load data/imports/*.json into imported_orgs (safe to re-run)
npm run imports:enrich   # match names to IRS records and store 990 figures (cached; add -- --recheck to redo)
npm run imports:categorize  # re-sort listings into the causes after changing rules in src/lib/imports.ts
npm run imports:clear    # remove all imported listings and IRS rows — run before production
```

Causes are assigned best-effort: the IRS NTEE code when it maps to one of the causes, otherwise keywords
in the name (Spanish and English), otherwise the source's tags. Human-services organizations
(shelters, elder care, food banks), which fit none of the causes, stay in "Other". Listings with no IRS figures show "990 not available yet".

**Budgets** on imported listings are total functional expenses (Form 990 Part IX line 25, or 990-EZ line 17)
from the most recent filing in ProPublica's data. Each listing links to its ProPublica record to verify.

Name matching is conservative: a listing gets financials only when its normalized name scores ≥ 90 against
an IRS record in Puerto Rico and clearly beats any other candidate. Matches should still be spot-checked.

## Funders: five questions, a shortlist of six

Funders don't keep a profile. Someone tasked with finding what to fund in Puerto Rico answers five quick
questions at `/find` and immediately gets a shortlist of 6 **impact opportunities**: what nonprofits are
raising money for, posted the way companies post jobs. Each comes with the reasons it fits and links to find
the organization and its people on LinkedIn, where the conversation continues.

- The answers live in the URL (`/opportunities?c=education,public-health&g=100k-500k&m=990`), so a shortlist
  can be bookmarked or shared with colleagues, and downloaded as CSV for an internal memo.
- Subscribing is optional: an email and the saved search go in `subscriptions`. **Sending the emails is not
  built yet.**
- `src/lib/match.ts` scores each opportunity (cause, place, organization size, gift fit, type of funding,
  must-haves); `src/lib/shortlist.ts` keeps one per organization, ranks posted opportunities ahead of
  organizations that haven't posted one, and returns the top 6.

### Example data

`npm run examples:load` adds 8 **fictional** organizations with 12 impact opportunities so the flow can be
demoed; they're labeled "Example" everywhere. `npm run examples:clear` removes them. Examples use fictional
organizations on purpose: attaching made-up asks to real nonprofits would send funders after requests that
don't exist.

## Deploying (Netlify)

Live at https://justcause-pr.netlify.app (Netlify site `justcause-pr`).

There is no hosted database yet, so the deployed site runs on a **JSON snapshot** of the directory
(`DATA_SOURCE=snapshot` is set in Netlify's environment):

- Pages read `data/snapshot.json`, exported from your local Postgres. It is gitignored and bundled at build
  time, so **deploy from your machine**, not from GitHub:

  ```bash
  npm run snapshot:export
  npx netlify-cli deploy --prod
  ```

- Nonprofit applications (with their 990 PDF) and email subscriptions are saved as JSON in Netlify Blobs
  (stores `applications` and `subscriptions`). `/admin` lists applications read-only; approving needs a database.
- `ADMIN_PASSWORD` is set in Netlify's environment. View it with `npx netlify-cli env:get ADMIN_PASSWORD`.
- Netlify functions accept request bodies up to about 6 MB, so larger 990 PDFs fail to upload on the live site.

To switch to a hosted Postgres later, set `DATABASE_URL` in Netlify, remove `DATA_SOURCE`, and run the
migrations and data load against it.

## How it works

| Route | Purpose |
| --- | --- |
| `/` | Landing page for funders |
| `/organizations` | Directory with search, cause, budget band, state and audit filters |
| `/organizations/[slug]` | Full profile; `/990` serves the uploaded Form 990 PDF |
| `/causes`, `/causes/[slug]` | Browse by cause |
| `/apply` | Nonprofit application — every section required, plus a 990 PDF upload |
| `/admin` | Password-protected review queue: preview, approve or reject submissions |
| `/find` | Five quick questions for funders (causes, gift size, funding type, organization size, must-haves) |
| `/opportunities` | The shortlist: the 6 impact opportunities that fit best, why, and LinkedIn links to reach the people; `/opportunities/export` downloads it as CSV |
| `/listings/[slug]` | Unclaimed (imported) listing profile |

Submissions are validated server-side (EIN format, $1M–$50M budget band, functional expenses summing to the
total, minimum board/track record/roadmap entries, real PDF) and stored as `pending` until approved.

For deployment, point `DATABASE_URL` at a hosted Postgres and run `npm run db:migrate` as part of the
release. 990 PDFs (≤20 MB) are stored in Postgres for now; move them to object storage (S3, R2, Vercel Blob)
if volume grows.

Key settings live in `src/lib/config.ts` (budget range, budget bands, upload limit) and
`src/lib/causes.ts` (cause list and colors).
