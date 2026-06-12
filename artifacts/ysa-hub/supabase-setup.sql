-- ============================================================
-- YSA Skills Hub — Supabase Setup SQL
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- Uses id = auth.users(id) as the primary key (standard pattern)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    text,
  email                   text,
  phone                   text,
  ward                    text,
  stake                   text,
  role                    text NOT NULL DEFAULT 'student'
                            CHECK (role IN ('student', 'instructor', 'admin')),
  member_status           text NOT NULL DEFAULT 'member'
                            CHECK (member_status IN ('member', 'friend')),
  activity_id             text,
  instructing_activity_id text,
  referral_source         text,
  avatar_url              text,
  notify_email            boolean DEFAULT true,
  notify_whatsapp         boolean DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ── If the table already exists, apply these changes safely ──

-- Remove the old separate user_id column if present (old schema artifact)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;

-- Add missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instructing_activity_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_status           text NOT NULL DEFAULT 'member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email            boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_whatsapp         boolean DEFAULT false;

-- Fix role CHECK constraint: only 'student', 'instructor', 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'instructor', 'admin'));

-- Fix member_status CHECK constraint: only 'member', 'friend'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_member_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_member_status_check
  CHECK (member_status IN ('member', 'friend'));

-- Migrate any legacy 'member' role values to 'student'
UPDATE public.profiles SET role = 'student' WHERE role = 'member';

-- Migrate any legacy member_status values that were repurposed from old role column
UPDATE public.profiles SET member_status = 'member' WHERE member_status NOT IN ('member', 'friend');


-- ============================================================
-- 2. OTHER TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  instructor_id   text,
  max_members     int,
  current_members int DEFAULT 0,
  schedule        text,
  location        text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id   text,
  check_in_time timestamptz NOT NULL DEFAULT now(),
  session_date  date NOT NULL,
  checked_in_by uuid,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_activity_id text,
  to_activity_id   text,
  reason           text,
  status           text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  message        text NOT NULL,
  channel        text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'both')),
  scheduled_for  timestamptz NOT NULL,
  recipient_type text DEFAULT 'all' CHECK (recipient_type IN ('all', 'activity', 'specific')),
  activity_id    text,
  recipient_ids  text[],
  sent           boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  type       text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- All policies use auth.uid() = id (profiles.id IS the auth UUID)
-- ============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- Drop all old/conflicting policies
DROP POLICY IF EXISTS "Users can insert own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access"               ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile"                    ON public.profiles;
DROP POLICY IF EXISTS "read_all_profiles"                     ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile"                    ON public.profiles;

-- PROFILES: any authenticated user can insert their own row (id must equal their auth UID)
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- PROFILES: any authenticated user can read any profile
CREATE POLICY "read_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- PROFILES: users can only update their own row
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ATTENDANCE
DROP POLICY IF EXISTS "read_attendance"   ON public.attendance;
DROP POLICY IF EXISTS "insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "delete_attendance" ON public.attendance;

CREATE POLICY "read_attendance"   ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delete_attendance" ON public.attendance FOR DELETE TO authenticated USING (true);

-- TRANSFER REQUESTS
DROP POLICY IF EXISTS "read_transfers"   ON public.transfer_requests;
DROP POLICY IF EXISTS "insert_transfer"  ON public.transfer_requests;
DROP POLICY IF EXISTS "update_transfer"  ON public.transfer_requests;

CREATE POLICY "read_transfers"  ON public.transfer_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_transfer" ON public.transfer_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_transfer" ON public.transfer_requests FOR UPDATE TO authenticated USING (true);

-- REMINDERS
DROP POLICY IF EXISTS "read_reminders"   ON public.reminders;
DROP POLICY IF EXISTS "insert_reminders" ON public.reminders;
DROP POLICY IF EXISTS "update_reminders" ON public.reminders;
DROP POLICY IF EXISTS "delete_reminders" ON public.reminders;

ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS recipient_ids text[];

CREATE POLICY "read_reminders"   ON public.reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_reminders" ON public.reminders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_reminders" ON public.reminders FOR DELETE TO authenticated USING (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "read_own_notifications"    ON public.notifications;
DROP POLICY IF EXISTS "insert_notifications"      ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications"  ON public.notifications;
DROP POLICY IF EXISTS "delete_own_notifications"  ON public.notifications;

CREATE POLICY "read_own_notifications"   ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "insert_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid()::text = user_id);


-- ============================================================
-- 4. REMOVE any auth.users triggers
-- Profile creation is handled entirely by the app (AuthContext.tsx
-- and AuthCallbackPage.tsx). A failing trigger blocks signup
-- completely, so we drop all known ones here.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS on_new_user             ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS profiles_trigger        ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
