-- Migration: Storage bucket for attachments
-- Created by previous agent

-- Create bucket (if not exists)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Allow authenticated uploads
create policy if not exists "Allow authenticated uploads" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');

-- Allow public read
create policy if not exists "Allow public read" on storage.objects
  for select to anon using (bucket_id = 'attachments');

-- Allow authenticated delete own files
create policy if not exists "Allow authenticated delete own" on storage.objects
  for delete to authenticated using (bucket_id = 'attachments' and owner = auth.uid());
