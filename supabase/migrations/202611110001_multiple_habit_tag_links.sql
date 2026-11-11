-- The latest Progresso version allows a habit to link to several timer tags.
-- The initial schema was already applied, so keep this as an additive change.

alter table public.habits
  add column if not exists linked_tag_ids jsonb not null default '[]'::jsonb
  check (jsonb_typeof(linked_tag_ids) = 'array');

-- Preserve any habits created under the earlier single-tag format.
update public.habits
set linked_tag_ids = jsonb_build_array(linked_tag_id)
where linked_tag_id <> ''
  and jsonb_array_length(linked_tag_ids) = 0;
