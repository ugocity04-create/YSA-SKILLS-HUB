---
name: Instructor profile display
description: How instructors differ from students in profile data and display — activity column, trigger gotcha.
---

## Rule
Instructors store their skill in `instructing_activity_id`; students store it in `activity_id`. Any page that reads or writes activity information must branch on `profile.role === 'instructor'`.

**Why:** The signup form correctly sets the right column at registration time, but profile view/edit pages that only read `activity_id` will always show "No skill class assigned" for instructors.

**How to apply:**
- `currentActivity` lookup: `isInstructor ? profile.instructing_activity_id : profile.activity_id`
- Save payload: set the correct field to the value, set the other to null
- Edit form label: "Skill You Instruct" for instructors, "Skill Class" for students
- Display subtitle: "Instructor" for instructors, member_status for students

## Trigger gotcha
Database triggers on `auth.users` that INSERT into `profiles` will cause `supabase.auth.signUp()` to return "Database error saving new user" and roll back the entire auth user creation. The app creates profiles itself (AuthContext.createProfile + AuthCallbackPage). Remove all triggers on auth.users — see supabase-setup.sql section 4.
