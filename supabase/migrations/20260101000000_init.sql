-- ===========================================================================
-- Sathi — initial schema
-- Verified working professionals in Nepal, one niche at a time.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'professional', 'admin');
create type public.verification_status as enum ('pending', 'verified', 'rejected');

-- Only "helpful" ships in v1. Deliberately an enum so adding a second reaction
-- later is a migration, not a refactor. NOTE: there is no scoring/points table
-- and none should be added without a product decision.
create type public.reaction_type as enum ('helpful');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.slugify(v text)
returns text
language sql
immutable
as $fn$
  select trim(both '-' from regexp_replace(lower(coalesce(v, '')), '[^a-z0-9]+', '-', 'g'));
$fn$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- niches
-- Seeded with "tech" only. The table exists so that opening a second niche is
-- a row insert plus a decision about who gets verified in it.
-- ---------------------------------------------------------------------------
create table public.niches (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text,
  description text,
  emoji       text,
  -- Hex accent so each niche can carry its own colour as the platform grows.
  accent      text not null default '#C8102E',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users — mirror of auth.users, populated by trigger.
-- ---------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        public.user_role not null default 'student',
  full_name   text,
  avatar_url  text,
  -- Set once the role-specific onboarding (niche picker / profile builder) is done.
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- Niches a student says they care about (2-3 at signup, editable later).
create table public.user_niches (
  user_id    uuid not null references public.users (id) on delete cascade,
  niche_id   uuid not null references public.niches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, niche_id)
);

-- ---------------------------------------------------------------------------
-- professional_profiles
-- ---------------------------------------------------------------------------
create table public.professional_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.users (id) on delete cascade,
  display_name        text not null,
  headline            text,
  bio                 text,
  linkedin_url        text not null,
  niche_id            uuid references public.niches (id) on delete set null,
  verification_status public.verification_status not null default 'pending',
  founding_member     boolean not null default false,
  -- [{ "label": "Portfolio", "url": "https://..." }, ...]
  links               jsonb not null default '[]'::jsonb,
  reviewed_at         timestamptz,
  reviewed_by         uuid references public.users (id) on delete set null,
  review_note         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint professional_profiles_links_is_array
    check (jsonb_typeof(links) = 'array'),
  -- Shape check only. Verification itself is a human reading the profile.
  constraint professional_profiles_linkedin_url_shape
    check (linkedin_url ~* '^https?://([a-z0-9-]+[.])?linkedin[.]com/.+')
);

create index professional_profiles_status_idx
  on public.professional_profiles (verification_status, created_at desc);
create index professional_profiles_niche_idx
  on public.professional_profiles (niche_id)
  where verification_status = 'verified';

create trigger professional_profiles_touch_updated_at
  before update on public.professional_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- spaces — exactly one per verified professional.
-- ---------------------------------------------------------------------------
create table public.spaces (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.professional_profiles (id) on delete cascade,
  slug            text not null unique,
  headline        text,
  created_at      timestamptz not null default now()
);

create or replace function public.unique_space_slug(p_base text)
returns text
language plpgsql
as $fn$
declare
  v_base text := coalesce(nullif(public.slugify(p_base), ''), 'space');
  v_slug text;
  v_n    int := 1;
begin
  v_slug := v_base;
  while exists (select 1 from public.spaces where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;
  return v_slug;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- posts / comments / reactions
-- ---------------------------------------------------------------------------
create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete cascade,
  content    text not null check (length(btrim(content)) between 1 and 8000),
  -- 'intro' marks the templated first post from the onboarding prompt.
  kind       text not null default 'post' check (kind in ('post', 'intro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_space_created_idx on public.posts (space_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);

create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete cascade,
  content    text not null check (length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_created_idx on public.comments (post_id, created_at asc);

create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

-- One row per (user, target, type). Exactly one of post_id / comment_id is set.
create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  post_id    uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  type       public.reaction_type not null default 'helpful',
  created_at timestamptz not null default now(),
  constraint reactions_one_target check ((post_id is not null) <> (comment_id is not null))
);

create unique index reactions_unique_post
  on public.reactions (user_id, post_id, type)
  where post_id is not null;
create unique index reactions_unique_comment
  on public.reactions (user_id, comment_id, type)
  where comment_id is not null;
create index reactions_post_idx on public.reactions (post_id) where post_id is not null;
create index reactions_comment_idx on public.reactions (comment_id) where comment_id is not null;

-- ---------------------------------------------------------------------------
-- follows — students following professionals.
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id     uuid not null references public.users (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (follower_id, professional_id)
);

create index follows_professional_idx on public.follows (professional_id);

-- ---------------------------------------------------------------------------
-- New auth user -> public.users row.
-- Everyone lands as a student; submitting a professional application is what
-- promotes the role. OAuth metadata is not trusted for privilege decisions.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
