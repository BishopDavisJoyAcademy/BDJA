-- Migration: VORA content management table
-- Created for BDJA admin CMS

create table if not exists public.vora_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_url text not null,
  subject text not null,
  grade_level text not null,
  topic text,
  duration text,
  thumbnail_url text,
  is_public boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table if exists public.vora_content enable row level security;

-- Policies
create policy if not exists "Public can view public vora"
  on public.vora_content
  for select to anon
  using (is_public = true);

create policy if not exists "Authenticated can view all vora"
  on public.vora_content
  for select to authenticated
  using (true);

create policy if not exists "Admin can manage vora"
  on public.vora_content
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and user_category = 'admin'
    )
  );

-- Index for common queries
create index if not exists idx_vora_subject_grade on public.vora_content(subject, grade_level);
create index if not exists idx_vora_public on public.vora_content(is_public);
