---
name: Reminder delivery architecture
description: How the Send Reminder feature works — frontend + API server split, no service-role key needed
---

# Reminder Delivery Architecture

The reminder flow splits responsibilities between frontend and API server to avoid exposing keys.

**Why:** Resend and Twilio API keys must stay server-side. Supabase DB operations stay in the frontend (already has auth context + anon key).

**How it works:**
1. Frontend (AdminDashboard) queries Supabase for matching profiles (anon key, authenticated user)
2. Frontend inserts reminder record to Supabase with `sent: false`
3. Frontend POSTs to `/api/reminders/send` with `{ title, message, channel, recipients[] }`
4. API server sends emails (Resend) and/or WhatsApp (Twilio) using server-side env vars
5. Frontend receives delivery result `{ emailCount, whatsappCount, errors[] }`
6. Frontend updates reminder `sent: true` in Supabase, stores delivery result in local `deliveryResults` state

**Env vars needed on API server (not VITE_):**
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

**Delivery display:** In-memory `deliveryResults: Record<reminderId, {...}>` — shows blue badge "N email + N WA delivered" in the log for the current session. Resets on page refresh; `sent: true` persists via Supabase.

**Phone normalization:** Nigerian numbers starting with `0` → `+234XXXXXXXXX` → `whatsapp:+234XXXXXXXXX`.
