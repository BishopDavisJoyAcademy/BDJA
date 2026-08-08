-- Migration: VORA content management table
-- Created for BDJA admin CMS

-- Create table if not exists
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

-- Add is_public column if table exists but column doesn't (for idempotent runs)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vora_content' and column_name = 'is_public'
  ) then
    alter table public.vora_content add column is_public boolean default true;
  end if;
end $$;

-- Enable RLS
alter table if exists public.vora_content enable row level security;

-- Drop existing policies to avoid conflicts, then recreate
drop policy if exists "Public can view public vora" on public.vora_content;
drop policy if exists "Authenticated can view all vora" on public.vora_content;
drop policy if exists "Admin can manage vora" on public.vora_content;

-- Policies
create policy "Public can view public vora"
  on public.vora_content
  for select to anon
  using (is_public = true);

create policy "Authenticated can view all vora"
  on public.vora_content
  for select to authenticated
  using (true);

create policy "Admin can manage vora"
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
