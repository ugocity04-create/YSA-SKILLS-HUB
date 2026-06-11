# YSA Skills Hub

A Saturday Skills Management App for the YSA Gathering Place of the Ojodu Stake. Members register, attend weekly skill classes, check in via QR code, and request transfers. Admins manage members, mark attendance, approve transfers, and schedule reminders.

## Run & Operate

- `pnpm --filter @workspace/ysa-hub run dev` — run the frontend (served on PORT env var)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 / PORT env var)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + react-router-dom v7
- Auth & DB: Supabase (external — see env vars below)
- QR code: `qrcode` npm package
- Toasts: `sonner`
- Icons: `lucide-react`

## Where things live

- `artifacts/ysa-hub/src/` — all frontend code
  - `contexts/AuthContext.tsx` — Supabase auth + profile loading
  - `types/index.ts` — all TypeScript types + ACTIVITIES/WARDS constants
  - `pages/` — LandingPage, LoginPage, SignUpPage, MemberDashboard, QRCodePage, NotificationsPage, ProfilePage
  - `pages/admin/` — AdminDashboard, ActivitiesPage, ActivityDetailPage, MemberDirectoryPage, TransferRequestsPage, RemindersPage, SaturdayRosterPage
  - `components/` — QRCodeDisplay, TransferRequestModal, AppLayout, Sidebar, BottomNav
- `lib/api-spec/openapi.yaml` — API spec (currently only healthz; app uses Supabase directly)

## Architecture decisions

- Auth and data go directly through Supabase client (no custom Express routes for data) — keeps the stack simple for this community app.
- Signup bug fixed: after `supabase.auth.signUp`, checks whether `session` is present. If not (email confirmation enabled), shows "Check your email" screen instead of navigating to dashboard.
- Activities (8 skill classes) are defined as a static constant in `types/index.ts` rather than purely from the DB, so the UI always shows all 8 even before any DB data is loaded.
- React Router v7 used instead of Wouter (Bolt.new codebase used react-router-dom).

## Product

- **Members**: register with ward/skill selection, get a personal QR code for check-in, view attendance history, request class transfers, receive in-app notifications.
- **Admins**: overview dashboard with stats, manage 8 skill classes, view full member directory, approve/reject transfer requests (auto-notifies members), schedule reminders, view Saturday attendance roster with one-click check-in, export roster as CSV.

## Environment Variables (Supabase)

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Supabase Tables

`profiles`, `activities`, `attendance`, `transfer_requests`, `reminders`, `notifications`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Email confirmation may be enabled in Supabase — signup shows "Check your email" screen in that case (by design, not a bug).
- To make a user an admin: update their `role` column in the `profiles` table to `'admin'`.
- The `activities` table in Supabase uses string IDs like `catering`, `fashion-design`, etc. matching `ACTIVITIES` in `types/index.ts`.
