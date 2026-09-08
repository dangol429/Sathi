-- ===========================================================================
-- Row level security, column grants, and the admin review RPCs.
--
-- Two things are enforced structurally rather than by trust in the client:
--   1. Nobody can read another user's email address (column grant).
--   2. Nobody can set their own verification_status / founding_member
--      (column grant on insert+update). Only the admin RPCs below can.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- is_admin — SECURITY DEFINER so that policies on public.users can call it
-- without recursing into their own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.users where id = p_uid and role = 'admin'
  );
$fn$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere.
-- ---------------------------------------------------------------------------
alter table public.niches                enable row level security;
alter table public.users                 enable row level security;
alter table public.user_niches           enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.spaces                enable row level security;
alter table public.posts                 enable row level security;
alter table public.comments              enable row level security;
alter table public.reactions             enable row level security;
alter table public.follows               enable row level security;

-- ---------------------------------------------------------------------------
-- Grants. Start from nothing, hand back exactly what the app needs.
-- ---------------------------------------------------------------------------
revoke all on public.niches                from anon, authenticated;
revoke all on public.users                 from anon, authenticated;
revoke all on public.user_niches           from anon, authenticated;
revoke all on public.professional_profiles from anon, authenticated;
revoke all on public.spaces                from anon, authenticated;
revoke all on public.posts                 from anon, authenticated;
revoke all on public.comments              from anon, authenticated;
revoke all on public.reactions             from anon, authenticated;
revoke all on public.follows               from anon, authenticated;

grant select on public.niches to anon, authenticated;
grant select on public.spaces to anon, authenticated;

-- users: every column except `email` is world-readable. Email is deliberately
-- excluded, so `select('*')` on this table will fail — always name columns.
grant select (id, role, full_name, avatar_url, onboarded, created_at, updated_at)
  on public.users to anon, authenticated;
grant update (full_name, avatar_url, onboarded) on public.users to authenticated;

-- professional_profiles: a client may create and edit its own application,
-- but the verification columns are not grantable to it at all.
grant select on public.professional_profiles to anon, authenticated;
grant insert (user_id, display_name, headline, bio, linkedin_url, niche_id, links)
  on public.professional_profiles to authenticated;
grant update (display_name, headline, bio, linkedin_url, niche_id, links)
  on public.professional_profiles to authenticated;

grant select, insert, update, delete on public.posts to authenticated;
grant select on public.posts to anon;

grant select, insert, update, delete on public.comments to authenticated;
grant select on public.comments to anon;

grant select, insert, delete on public.reactions to authenticated;
grant select on public.reactions to anon;

grant select, insert, delete on public.follows to authenticated;
grant select on public.follows to anon;

grant select, insert, delete on public.user_niches to authenticated;

grant update (headline) on public.spaces to authenticated;

-- ---------------------------------------------------------------------------
-- niches — public reference data.
-- ---------------------------------------------------------------------------
create policy niches_select_all on public.niches
  for select using (true);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy users_select_all on public.users
  for select using (true);

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_niches — a student's own interests.
-- ---------------------------------------------------------------------------
create policy user_niches_select_own on public.user_niches
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy user_niches_insert_own on public.user_niches
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_niches_delete_own on public.user_niches
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- professional_profiles
-- Verified profiles are public. Pending/rejected ones are visible only to
-- their owner and to admins.
-- ---------------------------------------------------------------------------
create policy professional_profiles_select_verified on public.professional_profiles
  for select
  using (
    verification_status = 'verified'
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy professional_profiles_insert_self on public.professional_profiles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and verification_status = 'pending'
    and founding_member = false
  );

create policy professional_profiles_update_own on public.professional_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- spaces — public to read; created by the approval RPC, headline editable
-- by the owning professional.
-- ---------------------------------------------------------------------------
create policy spaces_select_all on public.spaces
  for select using (true);

create policy spaces_update_owner on public.spaces
  for update to authenticated
  using (
    exists (
      select 1 from public.professional_profiles p
      where p.id = spaces.professional_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.professional_profiles p
      where p.id = spaces.professional_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- posts — readable by everyone; only the verified owner of the space writes.
-- ---------------------------------------------------------------------------
create policy posts_select_all on public.posts
  for select using (true);

create policy posts_insert_space_owner on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.spaces s
      join public.professional_profiles p on p.id = s.professional_id
      where s.id = posts.space_id
        and p.user_id = auth.uid()
        and p.verification_status = 'verified'
    )
  );

create policy posts_update_author on public.posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy posts_delete_author on public.posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- comments — any signed-in user can join the thread.
-- ---------------------------------------------------------------------------
create policy comments_select_all on public.comments
  for select using (true);

create policy comments_insert_self on public.comments
  for insert to authenticated
  with check (author_id = auth.uid());

create policy comments_update_author on public.comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy comments_delete_author on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- reactions
-- ---------------------------------------------------------------------------
create policy reactions_select_all on public.reactions
  for select using (true);

create policy reactions_insert_self on public.reactions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy reactions_delete_self on public.reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create policy follows_select_all on public.follows
  for select using (true);

create policy follows_insert_self on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

create policy follows_delete_self on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

-- ===========================================================================
-- Admin review RPCs.
-- SECURITY DEFINER because approving touches columns no client role can write.
-- Each one re-checks is_admin() itself — the definer rights are not a bypass.
-- ===========================================================================

-- Size of the founding cohort. The first N verified professionals are flagged
-- founding_member; after that the flag stops being handed out.
create or replace function public.founding_cohort_size()
returns int
language sql
immutable
as $fn$ select 100 $fn$;

create or replace function public.approve_professional(p_profile_id uuid)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_profile        public.professional_profiles;
  v_verified_count int;
  v_is_founding    boolean;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*) into v_verified_count
  from public.professional_profiles
  where verification_status = 'verified';

  v_is_founding := v_verified_count < public.founding_cohort_size();

  update public.professional_profiles
     set verification_status = 'verified',
         founding_member     = founding_member or v_is_founding,
         reviewed_at         = now(),
         reviewed_by         = auth.uid(),
         review_note         = null
   where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.users set role = 'professional' where id = v_profile.user_id;

  insert into public.spaces (professional_id, slug, headline)
  values (
    v_profile.id,
    public.unique_space_slug(v_profile.display_name),
    v_profile.headline
  )
  on conflict (professional_id) do nothing;

  return v_profile;
end;
$fn$;

create or replace function public.reject_professional(p_profile_id uuid, p_note text default null)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_profile public.professional_profiles;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.professional_profiles
     set verification_status = 'rejected',
         reviewed_at         = now(),
         reviewed_by         = auth.uid(),
         review_note         = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$fn$;

revoke execute on function public.approve_professional(uuid) from public, anon;
revoke execute on function public.reject_professional(uuid, text) from public, anon;
grant execute on function public.approve_professional(uuid) to authenticated;
grant execute on function public.reject_professional(uuid, text) to authenticated;
