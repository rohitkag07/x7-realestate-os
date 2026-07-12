-- Private, tenant-scoped assets for deterministic WhatsAI keyword replies.
-- The first storage folder is always the business (builder) id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsai-media',
  'whatsai-media',
  false,
  16777216,
  array['image/jpeg', 'image/png', 'video/mp4', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.playbook_media_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  playbook_id uuid not null references public.assistant_playbooks(id) on delete cascade,
  rule_id text not null check (char_length(rule_id) between 1 and 60),
  storage_bucket text not null default 'whatsai-media' check (storage_bucket = 'whatsai-media'),
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'video/mp4', 'application/pdf')),
  file_name text not null check (char_length(file_name) between 1 and 180),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 16777216),
  status text not null default 'ready' check (status in ('ready', 'deleted', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playbook_media_assets_type_mime_check check (
    (media_type = 'image' and mime_type in ('image/jpeg', 'image/png')) or
    (media_type = 'video' and mime_type = 'video/mp4') or
    (media_type = 'document' and mime_type = 'application/pdf')
  )
);

create index if not exists playbook_media_assets_business_playbook_idx
  on public.playbook_media_assets (business_id, playbook_id, rule_id)
  where status = 'ready';

alter table public.playbook_media_assets enable row level security;

drop policy if exists "playbook media assets scoped to builder" on public.playbook_media_assets;
create policy "playbook media assets scoped to builder"
  on public.playbook_media_assets
  for all
  to authenticated
  using (business_id = public.auth_builder_id())
  with check (business_id = public.auth_builder_id());

drop policy if exists "whatsai media select own business" on storage.objects;
create policy "whatsai media select own business"
  on storage.objects for select to authenticated
  using (bucket_id = 'whatsai-media' and (storage.foldername(name))[1] = public.auth_builder_id()::text);

drop policy if exists "whatsai media insert own business" on storage.objects;
create policy "whatsai media insert own business"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'whatsai-media' and (storage.foldername(name))[1] = public.auth_builder_id()::text);

drop policy if exists "whatsai media update own business" on storage.objects;
create policy "whatsai media update own business"
  on storage.objects for update to authenticated
  using (bucket_id = 'whatsai-media' and (storage.foldername(name))[1] = public.auth_builder_id()::text)
  with check (bucket_id = 'whatsai-media' and (storage.foldername(name))[1] = public.auth_builder_id()::text);

drop policy if exists "whatsai media delete own business" on storage.objects;
create policy "whatsai media delete own business"
  on storage.objects for delete to authenticated
  using (bucket_id = 'whatsai-media' and (storage.foldername(name))[1] = public.auth_builder_id()::text);

create or replace function public.keyword_replies_media_shape_is_valid(payload jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_typeof(payload) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(payload) as rule
      where jsonb_typeof(rule) <> 'object'
        or (rule ? 'media_type' and coalesce(rule ->> 'media_type', '') not in ('image', 'video', 'document'))
        or (rule ? 'media_url' and jsonb_typeof(rule -> 'media_url') not in ('string', 'null'))
        or (rule ? 'media_storage_path' and jsonb_typeof(rule -> 'media_storage_path') <> 'string')
        or (rule ? 'media_asset_id' and jsonb_typeof(rule -> 'media_asset_id') <> 'string')
        or (rule ? 'media_type' and not (
          rule ? 'media_asset_id' or rule ? 'media_storage_path'
          or coalesce(rule ->> 'media_url', '') <> ''
        ))
    );
$$;

alter table public.assistant_playbooks
  drop constraint if exists assistant_playbooks_keyword_replies_media_shape_check;
alter table public.assistant_playbooks
  add constraint assistant_playbooks_keyword_replies_media_shape_check
  check (public.keyword_replies_media_shape_is_valid(keyword_replies));
