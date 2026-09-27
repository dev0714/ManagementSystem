<!-- AGENTSYNC.md: what this project is and does. Versioned in AgentSync; changes arrive by pull request. -->

# Cellular Citi — Operations CRM

A multi-tenant operations CRM built in **Next.js (App Router)** on top of the
**`ManagementSystem`** schema in the **Telecoms** Supabase project.

One login fronts three operational modules plus a CRM layer:

| Module | Slug | What it covers |
|---|---|---|
| JK Masjid Operations | `jk` | GPS clock-in, uniform selfies, Salaah readiness checklists, escalation alerts, repair queue |
| Fleet Management | `fleet` | Vehicles, driver logs, licence/disc/service compliance, expense claims, incidents |
| Property Management | `prop` | Properties, tenants, lease onboarding, invoicing, maintenance dispatch, tenant + contractor apps |
| CRM layer | — | Group overview, contacts, pipeline, activity, users & access |

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in the values below
npm run dev                    # http://localhost:3000
```

### Environment

```
NEXT_PUBLIC_SUPABASE_URL=https://eceqaeclkvsmazagedcy.supabase.co
SUPABASE_DB_SCHEMA=ManagementSystem

# Option A — publishable key + server key (RLS-gated, the default)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
MS_SERVER_KEY=<the value stored in ManagementSystem.app_config>

# Option B — a Supabase secret key instead (bypasses RLS; MS_SERVER_KEY unused)
# SUPABASE_SECRET_KEY=sb_secret_...

SESSION_SECRET=<32+ random characters>

# Optional: renders the demo-account picker on the login screen.
DEMO_PASSWORD=Demo@1234
```

Leave `DEMO_PASSWORD` unset in production and the picker disappears.

---

## Authentication

Sign-in uses **the schema's own `users` table**, not Supabase Auth.

- `users.password_hash` holds a bcrypt hash (cost 10), verified with `bcryptjs`.
- A successful sign-in inserts a row into `sessions` and sets an `httpOnly`,
  `sameSite=lax` cookie containing a 256-bit random token. Only the SHA-256 of
  that token is stored, so a database leak does not yield usable sessions.
- Sessions expire after 7 days and are deleted on sign-out.
- Sign-in runs a bcrypt compare even for unknown emails, so a missing user and
  a wrong password take the same time.

Change a password:

```bash
node scripts/set-password.mjs zaid@cellularciti.co.za 'NewPassw0rd!'
```

---

## Multi-tenancy

Every table carries `tenant_id`. Two workspaces are seeded — **Cellular Citi
Group** and **Atlas Facilities Group** — so isolation is observable, not just
asserted.

Isolation is enforced in three places:

1. **Session** — `tenant_id` is read from the server-side `sessions` row. No
   request parameter, header, or cookie field can change it.
2. **Reads** — every query filters `.eq('tenant_id', session.tenantId)`.
3. **Writes** — every mutation carries the same filter, so an id copied from
   another workspace updates zero rows rather than someone else's data.

Permissions are likewise server-side. The sidebar is *derived* from the session
(`src/lib/nav.ts`), and each route independently asserts its own requirement via
`requireModule` / `requireSuperAdmin` / `requireCrm` in `src/lib/auth.ts`. A
cleaner typing `/fleet` into the address bar is redirected to their own
workspace. `src/middleware.ts` is only a cheap cookie check — the real gate is
the server components, because only they can reach the database.

---

## Database security

The `ManagementSystem` schema is exposed to PostgREST, but every table has RLS
enabled with a single policy: requests must present the server key in the
`X-MS-Server-Key` header, checked against `ManagementSystem.app_config`. The
publishable key on its own returns nothing.

```
curl "$URL/rest/v1/users?select=email" -H "apikey: $PUBLISHABLE" \
     -H "Accept-Profile: ManagementSystem"
# => []

curl "$URL/rest/v1/users?select=email" -H "apikey: $PUBLISHABLE" \
     -H "Accept-Profile: ManagementSystem" -H "X-MS-Server-Key: $MS_SERVER_KEY"
# => [{"email":"zaid@cellularciti.co.za"}, ...]
```

The server key never reaches the browser — all data access happens in server
components and server actions. If you prefer the conventional setup, drop a
Supabase **secret key** into `SUPABASE_SECRET_KEY` instead; it bypasses RLS and
`MS_SERVER_KEY` becomes unnecessary.

Schema exposure was set with:

```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ManagementSystem';
notify pgrst, 'reload config';
```

If a project restart ever reverts this, add `ManagementSystem` under
**Dashboard → Project Settings → API → Exposed schemas**.

---

## Demo accounts

All seeded accounts use the password **`Demo@1234`**.

**Cellular Citi Group**

| Email | Role | Lands on |
|---|---|---|
| `zaid@cellularciti.co.za` | Group Super Admin | `/` |
| `aadil@cellularciti.co.za` | HQ Admin — Masjid Ops | `/jk` |
| `yusuf@cellularciti.co.za` | Site Manager | `/jk` |
| `ridwaan@cellularciti.co.za` | Cleaner | `/jk/shift` |
| `kegan@cellularciti.co.za` | HQ Repairs | `/jk/repairs` |
| `tania@cellularciti.co.za` | Fleet Manager | `/fleet` |
| `marius@cellularciti.co.za` | Driver | `/fleet/today` |
| `derek@cellularciti.co.za` | Line Manager | `/fleet/claims` |
| `rehana@cellularciti.co.za` | HR Officer | `/fleet/people` |
| `lauren@cellularciti.co.za` | Property Admin | `/property` |
| `naledi.m@outlook.com` | Tenant | `/property/portal` |
| `sipho@capeplumbing.co.za` | Contractor (temporary access) | `/property/jobs` |

**Atlas Facilities Group** — `owner@atlasgroup.co.za`, `fleet@atlasgroup.co.za`,
`props@atlasgroup.co.za`. Sign in as `owner@atlasgroup.co.za` alongside a
Cellular Citi account to see the two workspaces side by side.

---

## Creating, editing and deleting

Every list screen has an **＋ Add** panel and per-row **Edit** / **Delete**.
Covered: contacts and their detail fields, deals, tasks, users, module access,
sites, repair jobs, stock, assets under review, vehicles, drivers, incidents,
expense claims, expiries, fleet events, fleet documents, checklist templates
and their items, properties, tenants, leases, invoices and fault jobs.

All of it runs through one registry (`src/lib/crud.ts`) and two server actions
(`src/app/(app)/crud-actions.ts`). The client only ever submits a resource
*key* — the table, the writable column list and the permission rule are all
resolved server-side, so a forged form cannot reach a table or column that is
not declared. Every statement carries the session's `tenant_id`, and each
change writes an `activity_events` row.

Two details worth knowing:

- Passwords set through the user form are bcrypt-hashed in the action and
  never stored or echoed in the clear. Blank on edit leaves the password alone.
- A blank optional input means "use the column default" on create and "leave
  unchanged" on edit. Only columns marked `nullable` in the registry can be
  cleared to NULL — that distinction is what keeps the schema's NOT NULL
  constraints intact.

---

## What else is wired to real data

Beyond CRUD, these workflow actions write back to Postgres:

- **Cleaner shift flow** — GPS clock-in → uniform selfie → pass/fail readiness
  checklist. A failed item inserts a `maintenance_jobs` row for HQ Repairs and
  logs an `activity_events` entry.
- **Driver day** — start/end odometer logs (updating the vehicle), fuel/toll/work
  slips, accident logging that creates an `incidents` row.
- **Expense claims** — line manager approve/hold.
- **Tenant portal** — logging a fault creates a `fault_jobs` row, auto-dispatches
  it to the contractor for that category, and seeds the WhatsApp thread. It
  appears immediately on the admin fault board and in the contractor's app.
- **Fault board** — Logged → Dispatched → In progress → Completed, each step
  posting to the job thread.
- **Contractor app** — accept/start/complete, scoped to that contractor's jobs
  and their temporary-access window.
- **Invoicing** — send reminder, mark paid.
- **Repairs queue** — accept and sign off jobs.
- **Onboarding wizard** — six steps persisted to `onboarding_applications.data`.
- **Tasks** — tick to complete.

---

## Layout

```
src/
  app/
    login/                     sign-in (credentials, not Supabase Auth)
    (app)/                     authenticated shell: sidebar + top bar
      page.tsx                 group overview (super admin)
      contacts/ pipeline/ activity/ search/ admin/users/
      jk/        + alerts, operations, repairs, shift
      fleet/     + vehicles, checklists, events, documents, claims, people, today
      property/  + properties, tenants, onboarding, maintenance, invoicing, portal, jobs
  components/shell/            Sidebar, TopBar, ModuleTabs
  components/ui/               KpiCard, StatusPill, SourceBadge, FilterChips, Countdown, …
  lib/                         auth, db, nav, queries, format, prayer, types
  middleware.ts
scripts/set-password.mjs
```

Design tokens from the handoff live in `src/app/globals.css` — primary
`#007BFF`, navy `#0A2540`, page `#F1F4F8`, Open Sans, ZAR formatted `R 12 400`,
24-hour times, tabular numerals on numeric columns.

---

## Tests

An end-to-end suite drives the real UI in Chromium — sign-in, permission
boundaries, tenant isolation, and the write paths.

```bash
npm run build && npm run start   # terminal 1
npm run test:e2e                 # terminal 2 — screens, roles, isolation
npm run test:crud                # terminal 2 — create/edit/delete + write permissions
```

It reads `.env.local` for the Supabase credentials (used only to reset the
cleaner's shift to step 0 before exercising that flow) and honours
`E2E_BASE_URL` and `CHROMIUM_PATH`.

Last run: 61 + 15 checks, all passing — including that a cleaner typing
`/fleet`, `/admin/users` or `/` is redirected to their own workspace, that a
tenant cannot reach `/property/invoicing` or `/jk`, that a driver cannot reach
the vehicle list, that an Atlas Facilities user cannot see any Cellular Citi
record through any screen or through search, that a record created in one
workspace lands in that workspace, that a required field left blank is
rejected server-side and nothing is written, and that a user created through
the admin screen can then sign in with a bcrypt-hashed password.
