-- ============================================================================
-- Supabase schema for ai-job-assistant-server
-- ============================================================================
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> paste this file -> Run.
--   The script is idempotent: safe to run again on an existing database
--   (the ALTER statements at the bottom upgrade a database created by the
--    earlier version of this file).
--
-- SECURITY MODEL — read this before changing the policies.
--   The API server does NOT use Supabase Auth. `POST /api/auth/login` issues its
--   own JWT (middleware/auth.js, signed with JWT_SECRET) and the server talks to
--   Supabase with the SERVICE ROLE key.
--
--   Consequence: inside the database `auth.uid()` is ALWAYS NULL. The previous
--   version of this file wrote every policy against `auth.uid()`, so RLS denied
--   every read and write, and the services silently fell back to the file store.
--   That produced the worst possible outcome: Supabase was "configured" but no
--   data was ever written, with no visible error.
--
--   So: RLS stays ENABLED with NO permissive policies. The service role bypasses
--   RLS (that is what the service role is for), while the anon/authenticated
--   roles get deny-all — which is correct here, because no client talks to
--   Supabase directly. Authorisation is enforced in the API layer, where
--   middleware/auth.js scopes every query by the JWT's userId.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  openid text unique not null,
  nickname text,
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  resume_name text not null default '',
  resume_content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists history_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,
  title text not null default '',
  -- Optional grouping label shown in the history sidebar.
  -- NOTE: this column was missing before, while services/historyService.js
  -- inserted and selected it — every history write failed with PGRST204.
  project text not null default '',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- Indexes — match the columns the API actually filters and sorts on
-- ----------------------------------------------------------------------------
create index if not exists idx_resumes_user_id on resumes(user_id);
create index if not exists idx_history_user_id on history_records(user_id);
create index if not exists idx_history_type on history_records(type);
create index if not exists idx_history_project on history_records(project);
-- listHistory / listResumes order by created_at descending.
create index if not exists idx_history_user_created on history_records(user_id, created_at desc);
create index if not exists idx_resumes_user_created on resumes(user_id, created_at desc);


-- ----------------------------------------------------------------------------
-- Row Level Security: enabled, default-deny for client roles.
-- The service role used by the API server bypasses these entirely.
-- ----------------------------------------------------------------------------
alter table users enable row level security;
alter table resumes enable row level security;
alter table history_records enable row level security;

-- Drop the old auth.uid()-based policies. They never matched a row (auth.uid()
-- is null for this server) and only served to make every query fail.
drop policy if exists "Users can read own record" on users;
drop policy if exists "Users can update own record" on users;
drop policy if exists "Users can insert own resumes" on resumes;
drop policy if exists "Users can read own resumes" on resumes;
drop policy if exists "Users can update own resumes" on resumes;
drop policy if exists "Users can delete own resumes" on resumes;
drop policy if exists "Users can insert own history" on history_records;
drop policy if exists "Users can read own history" on history_records;
drop policy if exists "Users can update own history" on history_records;
drop policy if exists "Users can delete own history" on history_records;


-- ----------------------------------------------------------------------------
-- Upgrade path for databases created by the earlier version of this file
-- ----------------------------------------------------------------------------
alter table history_records
  add column if not exists project text not null default '';

alter table history_records
  alter column content set default '{}'::jsonb;


-- ----------------------------------------------------------------------------
-- Verification — run these after the migration to confirm it worked
-- ----------------------------------------------------------------------------
-- 1. The project column exists:
--      select column_name, data_type from information_schema.columns
--       where table_name = 'history_records' order by ordinal_position;
--
-- 2. No leftover policies that would block the server:
--      select tablename, policyname from pg_policies
--       where tablename in ('users','resumes','history_records');
--    Expected: zero rows.
--
-- 3. End to end, with the server running:
--      curl -X POST https://<your-host>/api/auth/login \
--        -H 'Content-Type: application/json' -d '{"code":"probe"}'
--    then check Supabase -> Table Editor -> users for the new row.
--    If no row appears, the server is still on the file-store fallback;
--    check the console for a "[store] ... falling back to file store" line.
