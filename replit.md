# YSA Skills Hub

A full-stack community platform for the Ojodu Stake YSA (Young Single Adults) Saturday Skills Program — handling student registration, attendance tracking, QR check-in, instructor dashboards, and admin management.

## Run & Operate

- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/ysa-hub run dev` — run the frontend (port 5000)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS 4, React Router v7, TanStack Query
- Backend/Auth/DB: Supabase (PostgreSQL + Auth + RLS)
- UI: shadcn/ui components, Lucide icons, Sonner toasts
- QR: qrcode npm package

## Where things live

- `artifacts/ysa-hub/` — the main React frontend app
- `artifacts/ysa-hub/src/pages/` — all page components
- `artifacts/ysa-hub/src/contexts/AuthContext.tsx` — Supabase auth + profile management
- `artifacts/ysa-hub/src/types/index.ts` — all types, ACTIVITIES list, WARDS list
- `artifacts/ysa-hub/src/lib/supabase.ts` — Supabase client (reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- `artifacts/ysa-hub/supabase-setup.sql` — full DB schema + RLS policies (run in Supabase SQL Editor)
- `artifacts/api-server/` — Express 5 API server (currently only /api/healthz)

## Architecture decisions

- **Supabase-only backend**: All data lives in Supabase; no custom Express routes are needed for the main app. The api-server exists for future expansion.
- **Activities are hardcoded constants**: The 8 skill classes are defined in `types/index.ts` as `ACTIVITIES` (not fetched from DB) so no DB query is needed to render activity info.
- **Profile = auth.uid()**: `profiles.id` is the Supabase auth user UUID — no separate user_id column.
- **Pending profile pattern**: Profile data is stored in localStorage during email confirmation flows so it survives the redirect back.
- **Role routing**: Students → `/dashboard`, Instructors → `/instructor-dashboard`, Admins → `/admin`.

## Product

- **Landing page** — public marketing page with skills grid and sign-up CTA
- **Sign-up flow** — 3-step: credentials → personal details + role → preferences
- **Student dashboard** — next session card (12PM–4PM Saturdays), attendance stats, QR code link, transfer request button
- **QR Code page** — personal QR code encoding user ID + activity for instructor scanning
- **Instructor dashboard** — student roster, one-click check-in/out, 8-week attendance chart, send reminder
- **Admin dashboard** — aggregate stats, per-activity attendance overview, reminder composer with templates
- **Admin sub-pages** — Activities, Member Directory, Transfer Requests, Reminders, Saturday Roster
- **Profile page** — view/edit name, phone, ward, skill class, notification prefs; sign out
- **Transfer requests** — students request a class change; admins approve/reject
- **Attendance tracking** — instructors mark students present; admins see aggregate view by date

## Supabase DB Tables

- `profiles` — users (id = auth.uid(), role: student/instructor/admin, member_status: member/friend)
- `activities` — skill class metadata (supplementary; app mainly uses hardcoded ACTIVITIES constant)
- `attendance` — check-in records (member_id, activity_id, session_date, check_in_time)
- `transfer_requests` — class transfer requests (pending/approved/rejected)
- `reminders` — scheduled notifications (recipient_type: all/activity/specific)
- `notifications` — per-user notification inbox

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `supabase-setup.sql` in Supabase SQL Editor before testing — it creates tables, RLS policies, and drops any conflicting auth triggers.
- `activity_id` on profiles is a `text` column (not uuid) — stores slug strings like "product-management".
- Vite config throws if `PORT` or `BASE_PATH` env vars are missing — always pass both when running dev.
- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set as Replit Secrets (not env vars).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
