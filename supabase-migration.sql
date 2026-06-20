-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  openid text unique not null,
  nickname text,
  avatar text,
  created_at timestamptz default now()
);

-- Resumes table
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  resume_name text not null default '',
  resume_content text not null default '',
  created_at timestamptz default now()
);

-- History records table
create table history_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,
  title text not null default '',
  content jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_resumes_user_id on resumes(user_id);
create index idx_history_user_id on history_records(user_id);
create index idx_history_type on history_records(type);

-- RLS: enable row-level security
alter table users enable row level security;
alter table resumes enable row level security;
alter table history_records enable row level security;

-- RLS: users can only read/update their own user record
create policy "Users can read own record"
  on users for select
  using (id = auth.uid());

create policy "Users can update own record"
  on users for update
  using (id = auth.uid());

-- RLS: users can CRUD their own resumes
create policy "Users can insert own resumes"
  on resumes for insert
  with check (user_id = auth.uid());

create policy "Users can read own resumes"
  on resumes for select
  using (user_id = auth.uid());

create policy "Users can update own resumes"
  on resumes for update
  using (user_id = auth.uid());

create policy "Users can delete own resumes"
  on resumes for delete
  using (user_id = auth.uid());

-- RLS: users can CRUD their own history records
create policy "Users can insert own history"
  on history_records for insert
  with check (user_id = auth.uid());

create policy "Users can read own history"
  on history_records for select
  using (user_id = auth.uid());

create policy "Users can update own history"
  on history_records for update
  using (user_id = auth.uid());

create policy "Users can delete own history"
  on history_records for delete
  using (user_id = auth.uid());
