-- Initial schema for the Progresso cloud migration.
-- This file is a local blueprint only; it has not been applied to any database.
-- App IDs remain text so existing browser-generated IDs can be preserved.

create table public.timer_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  primary key (user_id, id)
);

create table public.timer_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  tag_id text,
  tag_name text not null,
  tag_color text not null,
  duration_minutes numeric not null check (duration_minutes >= 0),
  duration_formatted text not null,
  occurred_at timestamptz not null,
  primary key (user_id, id)
);

-- tag_id intentionally has no foreign key: old session history must survive
-- when a timer tag is later deleted or renamed.
create index timer_sessions_user_occurred_at_idx
  on public.timer_sessions (user_id, occurred_at desc);

create table public.habits (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'interval')),
  interval_days integer not null default 2 check (interval_days >= 2),
  category text not null,
  size text not null,
  linked_tag_id text not null default '',
  created_at timestamptz not null,
  completions jsonb not null default '[]'::jsonb,
  reset_history jsonb not null default '[]'::jsonb,
  primary key (user_id, id)
);

create table public.notes_folders (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  parent_id text,
  sort_order bigint not null default 0,
  deleted_at_ms bigint,
  primary key (user_id, id)
);

create table public.notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  folder_id text,
  title text not null default '',
  body text not null default '',
  body_html text not null default '',
  tag_ids jsonb not null default '[]'::jsonb,
  updated_at_ms bigint not null,
  sort_order bigint not null default 0,
  deleted_at_ms bigint,
  primary key (user_id, id)
);

create index notes_user_folder_idx on public.notes (user_id, folder_id);

-- Stores small per-user browser preferences and the extra habit-category
-- list found in the export. Values are JSON so the original shapes survive.
create table public.user_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  primary key (user_id, key)
);

-- At most one recoverable active timer per signed-in user.
create table public.timer_checkpoints (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  saved_at_ms bigint not null
);

-- Keep every table private to the signed-in owner. Browser requests use the
-- authenticated role; the owner ID must match the ID in the user's auth token.
alter table public.timer_tags enable row level security;
alter table public.timer_sessions enable row level security;
alter table public.habits enable row level security;
alter table public.notes_folders enable row level security;
alter table public.notes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.timer_checkpoints enable row level security;

revoke all on public.timer_tags, public.timer_sessions, public.habits,
  public.notes_folders, public.notes, public.user_preferences,
  public.timer_checkpoints from anon;

grant select, insert, update, delete on public.timer_tags, public.timer_sessions,
  public.habits, public.notes_folders, public.notes,
  public.user_preferences, public.timer_checkpoints to authenticated;

create policy "Users manage their own timer tags" on public.timer_tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own timer sessions" on public.timer_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own habits" on public.habits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own note folders" on public.notes_folders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own notes" on public.notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own preferences" on public.user_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own timer checkpoint" on public.timer_checkpoints
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
