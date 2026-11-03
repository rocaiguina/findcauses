# FindCauses

A directory of mid-size U.S. nonprofits ($1M–$50M in annual expenses per Form 990) built for funders —
individual donors, foundations and corporate givers.

Each profile covers mission and focus areas, impact metrics, track record, networks, roadmap, Form 990
financials, board of directors and stewardship. Organizations are grouped into twelve causes: Climate Change,
Economy, Fiscal Policy, Civil Rights, Energy & Infrastructure, Arts & Culture, Recreation & Sports, Public Health,
Education, Housing, Disaster Relief, and Other (see `src/lib/causes.ts`).

## How it's built

- **`backend/`: Django** (Python 3.13, managed with `uv`). The database (Postgres on Neon), the admin at
  `/admin` (our CMS: organizations, claims, profiles, 990 checks, users) and the JSON API at `/api/*`.
- **Next.js** (this folder): the public site and the nonprofit dashboard. It reads the Django API, and proxies
  `/api/*` and `/admin/*` to it (`next.config.ts`), so the sign-in session cookie stays on the site's domain.

Hosting: Next.js on Netlify (`findcauses`), Django on Render (`render.yaml`), database on Neon, email via Resend.

## Running locally

```bash
createdb findcauses
cd backend && cp .env.example .env && uv run python manage.py migrate
uv run python manage.py load_directory ../data/directory.json   # organizations + IRS filings
uv run python manage.py createsuperuser                          # your admin login
uv run python manage.py runserver 8000
```

Then, in another terminal at the project root: `cp .env.example .env.local && npm install && npm run dev`, and
open http://localhost:3000. With `EMAIL_DELIVERY=log`, sign-in emails are printed in the Django terminal.

Backend tests: `cd backend && uv run python manage.py test`.

## Nonprofits: claim, complete, get certified

Modeled on "claim your business" review sites. Every organization confirmed against IRS records has a page.

- **Claim** (`/for-nonprofits` → `/listings/[slug]/claim`): sign in with an emailed link (no passwords). An
  email on the organization's website domain verifies the claim instantly; anything else (Gmail, a different
  domain) waits in **Admin → Claims** for approval. Rules: `backend/directory/verification.py`.
- **Complete the profile** (`/dashboard/[slug]/profile`): the full form, prefilled from IRS data. Saving
  publishes it, and the profile replaces the basic IRS page.
- **FindCauses Certified**: claimed + published profile + a Form 990 for one of the last 3 tax years (from IRS
  data, or uploaded and verified by an admin). Checked live in `Organization.certified_check`, so it lapses on
  its own when the 990 goes stale.
- **Website badge** (`/badge/[slug]`): an image the dashboard gives as copy-paste embed code. It says
  "Certified nonprofit" while they qualify and "Listed nonprofit" otherwise.
- **New organizations** not in the directory apply at `/apply`; an admin publishes them with the **Publish
  profile** action, which also verifies their uploaded 990 and activates their account.

## Funders: find, save, share

Built for a foundation program officer tasked with finding what to fund in Puerto Rico. No account.

- **Find:** search from the home page, or answer 4 questions at `/find` (causes and place, how you want to
  drive change, typical grant size, must-haves) to get 6 matches at `/opportunities`, each with the reasons.
- **Save:** ★ Save on any organization (directory, matches, profiles, home). Saved organizations live in the
  browser (`localStorage`) and the **Shortlist** tab shows the count.
- **Share:** `/shortlist` carries the saved organizations in its URL, so the link works for colleagues. It prints
  cleanly as a briefing memo (Print / Save as PDF) and downloads as CSV, with LinkedIn links to reach the people.

How organizations drive change (research & policy, advocacy & rights, coalitions & systems change, direct
services) is inferred in `src/lib/approach.ts` from names, descriptions and IRS codes, with hand-picked
overrides. Matching lives in `src/lib/match.ts`; the 6 matches come from `src/lib/shortlist.ts`.
Email subscriptions are stored, but **sending the emails is not built yet**.

## Deploying

- **Django on Render:** New → Blueprint → this repo (`render.yaml`). Set `DATABASE_URL` (Neon's pooled
  connection string) and `RESEND_API_KEY`. Each deploy runs migrations. Create your admin with
  `python manage.py createsuperuser` in the Render shell.
- **Next.js on Netlify:** set `BACKEND_URL` (the Render service URL) and `SITE_URL`, then
  `npx netlify-cli deploy --prod` (stop the dev server first: they share `.next`).
- **Data:** `uv run python manage.py load_directory <file.json>` loads or refreshes organizations and IRS
  filings without touching profiles or claims. Neon's project is linked in `neon.ts`.
- **Email:** until a domain is verified in Resend, `onboarding@resend.dev` only delivers to the Resend account's
  own address. Verify a domain and set `EMAIL_FROM` on Render.

Key settings: `src/lib/config.ts` (budget range), `src/lib/causes.ts` (causes and colors; keep in sync with
`CAUSES` in `backend/directory/models.py`).
