# NVCH Admin Portal

Web admin portal for NVCH (caregiver/home-care organization) staff: managing clients, caregivers, admins, homes, scheduling, payroll, training, approvals, and notifications. This document gets a new developer oriented quickly — architecture, conventions, and where each feature lives.

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Data fetching / cache | TanStack React Query v5 |
| HTTP client | Axios (single shared instance) |
| Forms & validation | react-hook-form + yup |
| Styling | CSS Modules (`*.module.css`) per component, no CSS-in-JS/Tailwind |
| Dates/time | `luxon` + `date-fns` |
| Calendar UI | `react-big-calendar` |
| Maps | `@react-google-maps/api` / `@googlemaps/js-api-loader` |
| Excel export | `exceljs` / `xlsx` |
| Icons | `lucide-react` |

Package name in `package.json` is `caregiver_app`, but this is the **admin portal**, not the mobile caregiver app (that's a separate codebase; this app talks to the same backend).

## 2. Running it locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Requires a `.env.local` with:
- `NEXT_PUBLIC_API_URL` — backend base URL (falls back to the Render-hosted API if unset, see `src/services/api/axiosClient.js`)
- `NEXT_PUBLIC_GOOGLE_API_KEY` — Google Maps API key (used for home geofencing / address autocomplete)

There is no local database or backend in this repo — it is a pure frontend that talks to a separate Node/Express-style API (`nvch-server`).

## 3. Path aliases (`jsconfig.json`)

```
@/*          -> src/*
@components/* -> src/components/*
@app/*       -> src/app/*
@utils/*     -> src/utils/*
@services/*  -> src/services/*
@public/*    -> src/assets/*
```

## 4. Architecture: the four-layer data flow

**This is the single most important convention in the codebase.** Every feature follows a strict one-directional layering:

```
endpoint (URL builder) → service (axios call) → hook (React Query) → page/component (UI)
```

1. **Endpoints** — `src/services/api/endpoints.js`. One `API_ENDPOINTS` object, grouped by domain (`CLIENTS`, `SHIFTS`, `PAYROLL`, …), holding path strings/builders only. No fetch logic here.
2. **Services** — `src/services/api/services/*Service.js`. One file per domain (`clientService.js`, `shiftService.js`, …). Thin async functions that call `axiosClient` with an `API_ENDPOINTS` entry and unwrap the response envelope (`data.data...`). No React here — these are plain functions, testable in isolation.
3. **Hooks** — `src/hooks/use*.js`. Wrap a service in React Query (`useQuery`/`useMutation`), expose `data`, `isLoading`, `fetchError` (read failures) vs `actionError` (mutation failures), and mutation callbacks (`addClient`, `updateClient`, …). This is where cache keys, `invalidateQueries`, and error-message extraction live.
4. **Pages/components** — `src/app/**/page.js` and feature `_components/`. Call the hook, render UI. **Never import a service file or call `useQuery`/`useMutation` directly from a page** — always go through a hook.

`src/services/api/axiosClient.js` is the single shared axios instance: injects the JWT (`sessionStorage.getItem("token")`) into every request, sets a 60s timeout (Render cold starts), and normalizes 403s into a friendly "log out and back in" message (permission slugs are baked into the JWT at login and don't refresh live).

Read `src/hooks/useClients.js` alongside `src/services/api/services/clientService.js` as the canonical example of this pattern before writing a new feature.

## 5. Auth & session

- `src/context/AuthProvider.js` wraps the whole app (via `src/app/providers.js`). It:
  - Redirects unauthenticated users away from protected routes, and authenticated users away from `/` (login) and `/forget_password`.
  - Enforces a **15-minute inactivity auto-logout**, synced across browser tabs via `localStorage` events (`logoutEvent`, `lastActivity`).
  - Token lives in `sessionStorage` (key `"token"`) — cleared on logout/tab-close, not persisted across browser restarts.
- `src/app/providers.js` also sets up the global `QueryClient` (5 min stale time, no refetch-on-focus, retries once but never on 4xx).

## 6. Permissions model

Defined in `src/utils/permissions.js`:
- `PERMISSION_SCHEMAS` — canonical list of grantable permission slugs, grouped by module (Admin, Caregiver, Client, Home, Hours, Shifts, Payroll, Training, …). This mirrors the backend's permission catalog — keep it in sync when the backend adds a slug.
- Slugs typically come in `all` vs `assigned` pairs (e.g. `view_all_clients` vs `view_assigned_clients`), reflecting **region-scoped access**: an admin may manage everyone, or only people who share a region with them.
- `canManageTarget(profile, target, allSlug, assignedSlug)` — the one helper for checking "can I act on this specific record?" Mirrors the backend's `assertCanManageUser` scoping logic. Use this instead of a bare `permissionSlugs.includes(...)` whenever an action is target-specific, so the UI never offers a control the backend would reject.
- `IMPLICIT_SELF_SLUGS` — every authenticated user implicitly has self-service permissions (view/update own profile, change own password); not shown as grantable.
- The sidebar (`src/components/layout/Sidebar.js`) filters nav tabs by `requiredSlugs`, and computes a couple of tabs dynamically (Scheduling/Training) because their shape depends on *which combination* of slugs a user holds, not just "has any."

`src/hooks/usePermissions.js` and `/permissions` pages manage the permission **groups** admins are assigned to (CRUD over groups, not over individual grants).

## 7. Folder structure

```
src/
  app/                 # Next.js App Router — one folder per feature (routes)
    <feature>/
      page.js               # list view
      [id]/page.js          # detail view
      [id]/edit/            # edit form (where applicable)
      add_new_<feature>/    # create form
      _components/          # feature-local components (underscore = not a route)
  components/
    UI/                # generic, reusable presentational components (Button, Modal, Table, Badge, ...)
    layout/            # Navbar, Sidebar, PageHeader, PageLayout — app chrome
  context/
    AuthProvider.js
  hooks/               # one use*.js per domain — the React Query layer
  services/api/
    axiosClient.js
    endpoints.js
    services/          # one *Service.js per domain — the axios layer
  utils/               # cross-cutting helpers (dates, formatting, validation, dropdown option lists, excel export)
```

**Component placement rule:** co-locate helpers/components with the feature that uses them (e.g. `app/training/_components/`). Only promote something to `src/utils/` or `src/components/UI/` once it's actually shared across multiple pages/features.

## 8. Feature map (`src/app/*`)

| Route | Purpose |
|---|---|
| `/` | Login |
| `/forget_password` | Password reset request/flow |
| `/dashboard` | Landing page after login |
| `/clients` | Client (care recipient) roster — CRUD, detail, region/home assignment |
| `/caregivers` | Caregiver roster — CRUD, detail, certificates, devices |
| `/admins` | Admin/staff accounts (portal users) |
| `/permissions` | Permission groups (bundles of slugs) assigned to admins |
| `/homes` | Group homes — CRUD, geofencing (Google Maps), staff/client assignment |
| `/scheduling` | Shift calendar (`react-big-calendar`), shift CRUD, `shift_builder` (recurring shift templates), `shift_day`/`shift_list` drill-downs, overtime & capacity-exceeded guardrails |
| `/training` | Training sessions — scheduling, attendee rosters, attendance tracking (clock in/out), bulk attendance overrides |
| `/approvals` | Generic approval queue (e.g. `caregiver_certificate` approvals) + acknowledgment tab |
| `/payroll` | Pay-period cover sheet, per-caregiver hour entries/exceptions, manual entries, house-level payroll reviews, banked-hours & vacation-pay-payout approvals |
| `/holidays` | Stat holiday definitions + per-caregiver holiday pay rules |
| `/focus_notes` | Client focus notes (detail view, linked from client/shift context) |
| `/notification` | Push/broadcast notifications (to individuals, homes, regions, or all caregivers/admins) |
| `/setting` | Current user's own profile, security (change password), notification preferences |

Most feature folders follow the same shape: `page.js` (list, with search/filter/pagination), `[id]/page.js` (detail), `add_new_*/page.js` or `new/page.js` (create), `[id]/edit/page.js` (edit), and a local `_components/` folder for anything specific to that feature.

## 9. Key cross-cutting conventions

- **Timezone display rule** (`src/utils/dates.js`): all wall-clock timestamps (createdAt, shift times, decidedAt, …) render in **Atlantic Time** (`America/Halifax`) via `formatDateTime`. **Exception:** calendar-only dates (certificate issue/expiry/renewal) are stored as midnight-UTC and must render via `formatDateOnly`, which pins to UTC instead — converting to Atlantic Time would shift the displayed date back a day. Always use these helpers rather than ad hoc `toLocaleString` calls.
- **Filter persistence**: `src/hooks/usePersistedState.js` persists list-page UI state (search/filter/page) to `sessionStorage`, so navigating list → detail → back preserves filters, while an actual browser refresh resets to defaults (it detects hard reload via the Navigation Timing API). Being rolled out incrementally across list pages.
- **Sidebar collapse state**: `src/components/layout/useSidebarCollapsed.js` persists the collapsed/expanded sidebar preference.
- **Error separation**: hooks expose `fetchError` (initial load failure → render `<ErrorState />`) separately from `actionError` (mutation failure → render inline/toast), rather than one combined error.
- **Variable naming**: no abbreviations — write full descriptive identifiers.
- **Page header layout**: `<h1>` on the left, action/back buttons on the right, no breadcrumb above the title; style `h1` via the `.pageHeader h1` tag selector rather than a one-off class.
- **Comments**: kept minimal — a comment is only added when it explains a non-obvious *why* (a constraint, a workaround, an invariant), not what the code already says. See existing files like `usePersistedState.js` or `Sidebar.js` for the expected density.

## 10. Shared UI kit (`src/components/UI/`)

Generic, feature-agnostic building blocks used across the app: `Table`, `Pagination`, `Modal`, `ConfirmDeleteModal`, `StatusToggleConfirmModal`, `Badge`, `Button`, `IconButton`, `Card`, `EmptyState`, `ErrorState`, `ActionMessage` (toast-style feedback), `PersonSearchField` / `PersonMultiSelect`-style pickers, `AddressAutocomplete` + `GeofenceMap` (Google Maps home geofencing), `CertificateModal` / `ProfilePictureModal` (file upload flows), `RegionCheckboxGroup`, `RejectReasonField`. Reach for these before building a new one-off.

## 11. Utilities worth knowing about (`src/utils/`)

- `dates.js` — display formatting (see §9).
- `timeHandling.js` / `payPeriod.js` — shift duration math, pay-period boundary calculations.
- `formatting.js` — general display formatting (currency, names, etc.).
- `validation.js` — shared yup schemas.
- `permissions.js` — see §6.
- `shiftStatus.js` — shift status label/color mapping.
- `dropdownList/` — static option lists for selects (region, department, home type, certificate type, training type, pay category, marital status, admin level).
- `excelExport/` — building payroll/schedule Excel workbooks with `exceljs` (cover sheet, ack sheet, per-home sheet, payroll hours sheet, schedule sheet).

## 12. Backend integration notes

- API base URL defaults to a Render-hosted server; override via `NEXT_PUBLIC_API_URL`.
- Response envelope convention: most endpoints return `{ success, data: {...} }`; services unwrap to the relevant sub-key (e.g. `data.data.user`, `data.data.clients`).
- JWT carries the user's `permissionSlugs` and `regions` at sign-in time — **permission changes require the affected user to log out and back in** to take effect (the frontend cannot refresh this mid-session; the 403 interceptor in `axiosClient.js` surfaces this to the user).
- Real-time notifications use Server-Sent Events (`NOTIFICATIONS.STREAM` / `STREAM_TOKEN` endpoints) — see `src/hooks/useNotifications.js`.

## 13. Where to go next

- Pick a simple feature (e.g. `/holidays`) and trace it top to bottom: `endpoints.js` → `holidayService.js` → `useHolidays.js` → `app/holidays/page.js`. That round trip is the whole architecture in miniature.
- For anything permission-gated, check `src/utils/permissions.js` and how the relevant page/hook uses `canManageTarget` or a plain slug check.
- For anything involving timestamps, use `src/utils/dates.js` rather than formatting dates inline.
