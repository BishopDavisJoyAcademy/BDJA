-- Migration: VORA content management table
-- Fully idempotent - safe to run multiple times

-- Create table if not exists with all columns
create table if not exists public.vora_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_url text not null,
  subject text not null default 'General',
  grade_level text not null default 'Grade 1',
  topic text,
  duration text,
  thumbnail_url text,
  is_public boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add missing columns one by one (idempotent)
do $$
begin
  -- subject
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'subject') then
    alter table public.vora_content add column subject text not null default 'General';
  end if;

  -- grade_level
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'grade_level') then
    alter table public.vora_content add column grade_level text not null default 'Grade 1';
  end if;

  -- topic
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'topic') then
    alter table public.vora_content add column topic text;
  end if;

  -- duration
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'duration') then
    alter table public.vora_content add column duration text;
  end if;

  -- thumbnail_url
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'thumbnail_url') then
    alter table public.vora_content add column thumbnail_url text;
  end if;

  -- is_public
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'is_public') then
    alter table public.vora_content add column is_public boolean default true;
  end if;

  -- created_by
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'created_by') then
    alter table public.vora_content add column created_by uuid references auth.users(id);
  end if;

  -- created_at
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'created_at') then
    alter table public.vora_content add column created_at timestamptz default now();
  end if;

  -- updated_at
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vora_content' and column_name = 'updated_at') then
    alter table public.vora_content add column updated_at timestamptz default now();
  end if;
end $$;

-- Enable RLS
alter table if exists public.vora_content enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Public can view public vora" on public.vora_content;
drop policy if exists "Authenticated can view all vora" on public.vora_content;
drop policy if exists "Admin can manage vora" on public.vora_content;

-- Recreate policies
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

-- Indexes
create index if not exists idx_vora_subject_grade on public.vora_content(subject, grade_level);
create index if not exists idx_vora_public on public.vora_content(is_public);
