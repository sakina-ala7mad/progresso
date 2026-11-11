-- Compatibility layer for the existing localStorage-based UI.
-- Store each app key as its original raw string so legacy reads remain exact.

create table if not exists public.app_storage (
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_key text not null check (
    left(storage_key, 13) = 'productivity_'
    or storage_key in ('focus-sessions', 'productivity-tags')
  ),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, storage_key)
);

alter table public.app_storage enable row level security;

revoke all on public.app_storage from anon;
grant select, insert, update, delete on public.app_storage to authenticated;

create policy "Users manage their own app storage" on public.app_storage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
