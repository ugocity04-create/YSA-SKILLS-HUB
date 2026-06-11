---
name: YSA Hub project
description: Key decisions and gotchas for the YSA Skills Hub app (Ojodu Stake).
---

## Signup bug fix
After `supabase.auth.signUp`, the code checks if `data.session` exists. If not (email confirmation enabled), it returns `needsConfirmation: true` and shows a "Check your email" screen. If session exists, it creates the profile row and navigates to dashboard. This pattern is in `AuthContext.tsx`.

**Why:** Supabase email confirmation is often enabled on new projects. Navigating to `/dashboard` before a session exists causes a silent white screen.

## Admin role
To promote a user to admin: set `role = 'admin'` in the `profiles` table. The `AdminRoute` component checks `profile.role === 'admin'`.

## Activity IDs
Activity IDs are kebab-case strings (`catering`, `fashion-design`, `ui-ux-design`, etc.) defined in `ACTIVITIES` constant in `types/index.ts`. These must match the `activity_id` values stored in the Supabase `profiles` table.

**Why:** The app uses static activity definitions for icons/names, joined against DB data by matching these IDs.

## Supabase direct access
This app does NOT route data through the Express API server — all reads/writes go directly through the Supabase JS client. The API server is left as a skeleton for future use.

**Why:** Keeps the architecture simple for a community/church management app with no sensitive server-side logic.

## Transfer notifications
When an admin approves/rejects a transfer, `TransferRequestsPage` inserts a row into the `notifications` table for the member's `user_id`. The member sees it in the Notifications page.
