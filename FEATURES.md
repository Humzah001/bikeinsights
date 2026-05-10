# My Bike Insights — Feature Inventory

This document lists **tenant-facing** and **platform-operator** capabilities implemented in the app today (derived from routes, UI, and server logic).

---

## 1. Product model

- **Multi-tenant SaaS**: Each workspace (tenant) has isolated bikes, rentals, repairs, expenses, notifications, and settings.
- **Roles**: Tenant-scoped access via session (`tenantId`, role); **platform admins** see extra tooling (e.g. Platform admin).
- **Branding**: App uses **My Bike Insights** for titles and marketing-facing strings where configured.

---

## 2. Authentication & onboarding

| Feature | Description |
|--------|-------------|
| **Login** | Email + password against tenant/session (`/login`). Session idle timeout redirect with friendly message. |
| **Logout** | Clears session via auth API. |
| **Invite accept** | Token-based signup (`/invite/accept`): name & phone chosen by user, password set; completes tenant membership via `/api/auth/accept-invite`. |
| **Auth callback** | `/auth/callback` completes Supabase email flows and forwards to invite acceptance when configured. |
| **Workspace blocked** | Login blocked when trial/paid period expired or workspace paused (tenant billing/access flags); message shown on login. |
| **Platform bootstrap** | Protected `/api/auth/bootstrap` for controlled setup (env-gated). |

---

## 3. Dashboard (`/dashboard`)

| Feature | Description |
|--------|-------------|
| **Month selector** | Switch KPIs and charts to any of the last ~36 months (or jump to a missing month). |
| **Overdue alert** | Current month: red alert when rentals are **overdue**, link to Pending payments. |
| **Pending payments alert** | Amber alert when rent is **due (today or earlier)** and still unpaid (`pending`/`partial`), excluding future first dues; hidden when overdue alert shows. |
| **Repairs alert** | Amber alert when bikes have repairs **pending** or **in progress**. |
| **Historical month banner** | Explains that financial charts are for selected month while fleet snapshot stays current. |
| **KPI cards** | Collected rent, active rentals (live vs overlapping selected month), pending payments (schedule-aware), fleet counts (available / rented / repair), expenses, net profit for selected month. |
| **Profit by period** | Tabs: **Weekly**, **Monthly**, **Yearly** — composed charts for collected rent, expenses, net profit; footnotes explain weekly rent attribution by **due date**, Monday–Sunday weeks. |
| **Twelve-month / six-year trends** | Profit charts over trailing periods. |
| **Bike status pie** | Snapshot of fleet status (theme-aware). |
| **Payment status pie** | Rentals **starting** in selected month: paid / pending / partial counts. |
| **Expenses pie** | Categories for selected month. |
| **Collected rent by bike** | Horizontal bar chart for selected month. |
| **Recent rentals** | Table for rentals starting in selected month; link to full list. |
| **Pending rentals table** | Rentals starting in month that still owe payment by schedule (or overdue); link to record payment. |
| **Recent repairs** | Repairs logged in selected month. |

**Background refresh on load**: Marks rentals **overdue** when past end date; creates **weekly rent overdue** notifications where applicable (`ensureOverdueRentalsUpdated`, `ensureWeeklyRentNotifications`).

---

## 4. Bikes (`/bikes`)

| Feature | Description |
|--------|-------------|
| **Fleet list** | All bikes with status, filters/search as implemented on page. |
| **Add bike** | Name, brand, model, color, serial, status, purchase info, weekly rate, notes. |
| **Bike detail** | Full profile, link from rentals; rental history context where shown. |
| **Edit bike** | Update fields above. |
| **Delete bike** | Dedicated delete flow (`/bikes/[id]/delete`). |
| **Image upload** | API `/api/upload/bike` for bike photo (`image_filename`). |
| **Statuses** | `available`, `rented`, `under_repair`, `retired`. |

---

## 5. Rentals (`/rentals`, `/rentals/[id]`)

| Feature | Description |
|--------|-------------|
| **List & filter** | Browse rentals with status/payment cues and export **CSV** (`Export CSV`). |
| **Add rental** | Pick **available** bike; customer contact; dates; weekly rate; payment status; optional initial rent; rent collection date / deposit / notes; creates rental and ties bike status. |
| **Rental detail** | Bike link; customer name / phone / email; schedule (week 1 due date + weekly cadence); amount paid vs total; badges for rental & payment status. |
| **Weekly rent collection** | Record payment per contract week when schedule allows (`record_weekly_payment`). |
| **Manual amount paid** | Add arbitrary collected amount with date. |
| **Mark fully paid** | Sets payment to paid, records settlement; deactivates rental for alerts when rules apply. |
| **Mark completed** | Rental lifecycle completion. |
| **Deposit** | Optional deposit amount; **mark deposit refunded** flag. |
| **Rent reminders** | Trigger customer reminder email (`/api/notify/reminder`) where configured. |
| **Edit rental** | Adjust customer, dates, rate, payment status, deposit fields, rent collection date, notes. |
| **Delete rental** | Removes rental and restores bike availability rules as implemented. |

**Payment logging**: Structured **`rental_payments`** rows (weekly, manual, settlement, initial, adjustment) with optional **due_on** for attribution.

---

## 6. Pending payments & overdue (`/rentals/pending`)

| Feature | Description |
|--------|-------------|
| **Overdue rentals table** | Past end date, not completed; days overdue; paid vs remaining; link to complete / call / **send reminder**. |
| **Pending payments table** | Active rentals with unpaid rent **due on or before today**; shows paid progress, remaining, rent-due summary, end date; record payment / reminder. |
| **Summary cards** | Total outstanding, counts, oldest overdue days. |
| **Customer phone column** | Tap-to-call links in tables. |

---

## 7. Collected rent (`/collected-rent`)

| Feature | Description |
|--------|-------------|
| **Payment ledger** | Per-row payments with due vs collected dates, amount, type, bike, customer, rental period, phone. |
| **Attribution** | Aligns with weekly due-date logic (see profit charts). |

---

## 8. Repairs (`/repairs`, `/repairs/add`, `/repairs/[id]/edit`)

| Feature | Description |
|--------|-------------|
| **List repairs** | Filter/sort by bike, status, dates as on page. |
| **Add repair** | Bike, description, date, cost, shop, status, notes. |
| **Edit repair** | Update fields; statuses: `pending`, `in_progress`, `completed`. |

---

## 9. Expenses (`/expenses`, `/expenses/add`)

| Feature | Description |
|--------|-------------|
| **List expenses** | By date and category. |
| **Add expense** | Amount, date, category (`fuel`, `storage`, `insurance`, `accessories`, `cleaning`, `other`), optional bike link, notes. |

---

## 10. Analytics (`/analytics`)

| Feature | Description |
|--------|-------------|
| **Date range dropdown** | Present in UI; charts currently use the **fixed 12-month** series computed on the server (selector does not yet reslice data). |
| **Export CSV** | Downloads revenue vs expenses vs profit by month. |
| **Charts** | Collected rent vs expenses vs profit (composed); monthly net P&L bars; top earning bikes; cost per bike (repairs + expenses stacked); rental duration distribution; payment status over time (stacked areas); busiest rental months; average weekly rate trend. |

---

## 11. Notifications (`/notifications`)

| Feature | Description |
|--------|-------------|
| **In-app feed** | Lists tenant notifications with type styling. |
| **Mark read** | Per notification and **mark all read**. |

**Types used in schema / UI** include: `rent_overdue`, `rent_due_soon`, `repair_due`, `payment_pending`, `week_rent_pending`. Generation today focuses on **overdue status**, **weekly unpaid weeks**, and related flows (see `lib/notifications.ts`).

---

## 12. Settings (`/settings`)

| Feature | Description |
|--------|-------------|
| **Business** | Business name, owner display name, **currency symbol**, **default weekly rate** for new rentals. |
| **Save** | Persists via `/api/tenant/settings`. |
| **Data backup** | Download ZIP of exported datasets (bikes, rentals, repairs, expenses, notifications) as CSV files inside the archive. |

Tenant preferences are provided app-wide via **`TenantPreferencesProvider`** (currency on dashboards, forms, charts).

---

## 13. Platform admin (`/platform-admin`)

Visible only for **platform administrators**.

| Feature | Description |
|--------|-------------|
| **Invite workspace** | Email, workspace name, reference contact name/phone, billing (`trial` / `active`), optional trial or paid-access duration; creates tenant + invitation + Supabase Auth invite when configured. |
| **Workspace table** | Billing status, access-until dates, pause/resume, grant paid days, delete workspace. |
| **Invitations menu** | Pending / accepted / expired; revoke; shows contact-at-invite vs **profile chosen at signup** when accepted. |
| **Members menu** | List members with name, phone, role; remove from workspace. |

---

## 14. APIs (REST summary)

| Area | Examples |
|------|-----------|
| **Auth** | `POST /api/auth/login`, `logout`, `touch`, `accept-invite`, `bootstrap` |
| **CRUD** | `GET|POST /api/bikes`, `GET|PATCH|DELETE /api/bikes/[id]` |
| | `GET|POST /api/rentals`, `GET|PATCH|DELETE /api/rentals/[id]` |
| | `GET|POST /api/repairs`, `GET|PATCH|DELETE /api/repairs/[id]` |
| | `GET|POST /api/expenses`, `PATCH|DELETE /api/expenses/[id]` |
| **Tenant** | `GET|PATCH /api/tenant/settings` |
| **Notifications** | `GET /api/notifications`, `PATCH /api/notifications/[id]`, `POST /api/notifications/mark-read` |
| **Utilities** | `POST /api/upload/bike`, `POST /api/notify/reminder` |
| **Platform admin** | `GET|POST /api/platform-admin/tenants`, `PATCH|DELETE .../tenants/[id]`, `DELETE .../invitations/[id]`, `POST .../members/remove` |

All tenant APIs enforce **tenant isolation** via session / server auth helpers.

---

## 15. UX & technical behaviour

| Feature | Description |
|--------|-------------|
| **Dark / light theme** | `next-themes` with persisted preference key. |
| **Responsive shell** | Sidebar collapse on desktop; mobile drawer pattern via `DashboardShell`. |
| **Middleware** | Protects dashboard routes; idle timeout; workspace access snapshot for non–platform-admin users; public paths for login, invite accept, auth callback; fragment-safe `/` for Supabase redirects. |
| **Calculations** | Centralised weekly rent schedule, FIFO-style attribution of collected amounts to weeks, profit windows, pending-payment detection (`lib/calculations.ts`). |
| **Email** | Invite templates (Supabase + repo HTML); optional **Resend** for rental payment reminders (`lib/email.ts`). |

---

## 16. Color scheme

**Source of truth**: CSS variables in [`app/globals.css`](app/globals.css), wired into Tailwind via `@theme inline` (shadcn-style tokens). Theme switching uses **`next-themes`** with `attribute="class"`, **`defaultTheme="dark"`**, persisted under storage key **`bikeinsights-theme`** (`components/ThemeProvider.tsx`).

### UI tokens (OKLCH)

The app is **neutral-first**: primary surfaces are grayscale; accent charts lean **blue / indigo** (`chart-*` hues ~252°–266°).

| Token | Light (`:root`) | Dark (`.dark`) | Typical use |
|-------|-----------------|----------------|-------------|
| **background** | `oklch(1 0 0)` (white) | `oklch(0.145 0 0)` (near-black) | Page canvas |
| **foreground** | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Body text |
| **card** / **popover** | White | Slightly lifted gray `oklch(0.205 0 0)` | Panels, dialogs |
| **primary** | Dark gray `oklch(0.205 0 0)` | Light gray `oklch(0.87 0 0 0)` | Buttons / emphasis (dark mode reads as light-on-dark primary) |
| **primary-foreground** | Near-white | Dark gray | Text on primary buttons |
| **secondary** / **muted** / **accent** | Very light gray `oklch(0.97 …)` | Darker gray fills `oklch(0.269 …)` / `oklch(0.371 …)` | Secondary surfaces, hover |
| **muted-foreground** | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Helper text |
| **destructive** | `oklch(0.58 0.22 27)` | `oklch(0.704 0.191 22.216)` | Danger actions |
| **border** / **input** | `oklch(0.922 0 0)` | White at **10–15%** opacity | Dividers, inputs |
| **ring** | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Focus rings |

**Corner radius**: `--radius: 0.625rem` (scaled to `sm`–`4xl` in theme).

### Chart palette (`chart-1` … `chart-5`)

Same OKLCH values in **light and dark** — five stepped blues/indigos for Recharts and multi-series visuals:

- **chart-1** `oklch(0.809 0.105 251.813)` — lightest series blue  
- **chart-2** `oklch(0.623 0.214 259.815)`  
- **chart-3** `oklch(0.546 0.245 262.881)`  
- **chart-4** `oklch(0.488 0.243 264.376)`  
- **chart-5** `oklch(0.424 0.199 265.638)` — deepest series blue  

### Sidebar tokens

Matched to the same system: light sidebar is off-white `oklch(0.985 …)`; dark sidebar aligns with **card** gray. **sidebar-primary** in dark mode uses **`chart-4`** for the active-brand strip on the rail.

### Semantic colors (Tailwind, not CSS variables)

Status and alerts use fixed Tailwind hues so meaning reads consistently:

| Meaning | Colors |
|---------|--------|
| **Success / paid / available / completed** | `green-500` backgrounds at 20% opacity; text `green-600` / dark `green-400` |
| **Info / rented / in-progress repair** | `blue-500` / `blue-600` / dark `blue-400` (bike “rented”; some repair states) |
| **Warning / partial / repairs / due-soon** | `amber-500` fills; borders like `amber-500/50`; text `amber-600` / dark `amber-400` |
| **Error / overdue / pending payment badge** | `red-500` fills; text `red-600` / dark `red-400` |

Examples: `DashboardClient.tsx`, `BikeStatusBadge.tsx`, `PaymentStatusBadge.tsx`, rentals list row highlights, `KPICard` variants, notifications icons.

---

## 17. Out of scope / not guaranteed by this doc

- Exact Supabase RLS policies and migration history — see `supabase/migrations/`.
- Third-party dashboards (Supabase, Vercel) configuration.
- Production SMTP / DNS — operational setup only.

---

*Generated from the codebase structure and behaviour; update this file when you add major features.*
