# JustCause

A directory of mid-size U.S. nonprofits ($1M–$50M in annual expenses per Form 990) built for funders —
individual donors, foundations and corporate givers.

Each profile covers mission and focus areas, impact metrics, track record, networks, roadmap, Form 990
financials, board of directors and stewardship. Organizations are grouped into eight causes: Climate Change,
Economy, Fiscal Policy, Civil Rights, Energy & Infrastructure, Arts & Culture, Recreation & Sports, and Other.

## Running locally

Requires Node 20+ and Postgres 14+ (e.g. `brew install postgresql@16`).

```bash
npm install
createdb justcause
cp .env.example .env.local   # then set DATABASE_URL and ADMIN_PASSWORD
npm run db:migrate           # create tables
npm run seed                 # 10 fictional sample organizations (marked "Sample")
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
npm run seed -- --force   # replace sample orgs (real submissions are never touched)
```

## How it works

| Route | Purpose |
| --- | --- |
| `/` | Landing page for funders |
| `/organizations` | Directory with search, cause, budget band, state and audit filters |
| `/organizations/[slug]` | Full profile; `/990` serves the uploaded Form 990 PDF |
| `/causes`, `/causes/[slug]` | Browse by cause |
| `/apply` | Nonprofit application — every section required, plus a 990 PDF upload |
| `/admin` | Password-protected review queue: preview, approve or reject submissions |

Submissions are validated server-side (EIN format, $1M–$50M budget band, functional expenses summing to the
total, minimum board/track record/roadmap entries, real PDF) and stored as `pending` until approved.

For deployment, point `DATABASE_URL` at a hosted Postgres and run `npm run db:migrate` as part of the
release. 990 PDFs (≤20 MB) are stored in Postgres for now; move them to object storage (S3, R2, Vercel Blob)
if volume grows.

Key settings live in `src/lib/config.ts` (budget range, budget bands, upload limit) and
`src/lib/causes.ts` (cause list and colors).
