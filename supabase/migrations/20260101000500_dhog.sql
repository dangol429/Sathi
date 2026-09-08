-- ===========================================================================
-- Dhog.
--
-- Dhog is what someone gives you when your answer actually helped them. It is
-- named after the gesture of respect you make to someone you look up to, and
-- the whole meaning of the word lives in the fact that it is freely given.
-- Two rules fall straight out of that and are enforced here rather than left
-- to the UI:
--
--   1. There is no anti-dhog. No reaction in this schema can carry a negative
--      weight, and nothing a user does can reduce another user's total. The
--      "not helpful" signal is a private flag (see public.flags) that routes
--      to a human and never touches a score.
--
--   2. Nobody can solicit it. That is a product constraint rather than a
--      schema one, but it is why there is no "requested dhog" state, no
--      reciprocity link between two reactions, and no notification hook here.
--
-- The numbers below are deliberately not exposed anywhere a user can read
-- them: reactions.weight has no select grant, and the totals are only
-- reachable through the aggregate views at the bottom.
--
-- These constants live here and nowhere else. src/lib/dhog.ts deliberately
-- carries no copy of them: anything shipped to a browser is readable by anyone,
-- and publishing the multipliers is the fastest way to teach people to farm them.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Post types.
--
-- There is deliberately no "accepted answer" here. Marking one answer as the
-- right one needs a control, a rule about who may press it, a badge, and an
-- explanation of what the badge means — for an outcome the dhog count already
-- produces on its own. Comments sort by dhog, so the answer that helped people
-- rises to the top without anyone being asked to adjudicate.
-- ---------------------------------------------------------------------------
create type public.post_type as enum ('question', 'career_story', 'opportunity', 'discussion');

alter table public.posts
  add column post_type public.post_type not null default 'discussion',
  add column hidden_at timestamptz;

alter table public.comments add column hidden_at timestamptz;

-- ---------------------------------------------------------------------------
-- Who is giving, and what that is worth.
--
-- Verification is a human reading a LinkedIn profile, so it cannot be farmed.
-- That is the entire anti-sockpuppet mechanism: five fake accounts earn a
-- rounding error, and a brand-new account earns exactly nothing.
-- ---------------------------------------------------------------------------
create type public.dhog_giver_tier as enum (
  'verified_same_niche',   -- verified professional, posting in their own field
  'verified_other_niche',  -- verified, different field
  'unverified',            -- a real account with some history
  'no_weight'              -- too new, or has never posted or commented
);

alter table public.reactions
  add column receiver_id uuid references public.users (id) on delete cascade,
  add column giver_weight_tier public.dhog_giver_tier,
  -- Never negative. There is no anti-dhog.
  add column weight numeric(8,4) not null default 0
    check (weight >= 0);

create index reactions_receiver_idx on public.reactions (receiver_id, created_at desc)
  where weight > 0;

-- ---------------------------------------------------------------------------
-- The constants. One function each so there is a single place to tune them.
-- ---------------------------------------------------------------------------

/** What a giver in each tier is worth, before any context or decay. */
create or replace function public.dhog_tier_weight(p_tier public.dhog_giver_tier)
returns numeric
language sql
immutable
as $fn$
  select case p_tier
    when 'verified_same_niche'  then 1.0
    when 'verified_other_niche' then 0.5
    when 'unverified'           then 0.15
    else 0.0
  end::numeric;
$fn$;

/**
 * The deliberate inversion of every other forum: answering is worth more than
 * posting, because answers are the product. A good question still earns
 * something — it should not be invisible — but not enough to be worth farming.
 *
 * This is also the only thing that makes a good answer rise: comments are
 * ordered by the dhog they have been given, so the useful one ends up on top
 * without anybody having to mark it.
 */
create or replace function public.dhog_context_multiplier(
  p_is_comment boolean,
  p_post_type public.post_type
)
returns numeric
language sql
immutable
as $fn$
  select case
    when p_is_comment                then 1.0     -- an answer: medium
    when p_post_type = 'question'    then 0.1     -- a question you asked: minimal
    else 0.33                                     -- a post: roughly a third of an answer
  end::numeric;
$fn$;

/**
 * Decay per (giver, receiver) pair over a rolling 30 days. Sharp on purpose:
 * by roughly the tenth gift it is worth nothing, which kills reciprocal
 * dhog-trading rings without anyone having to run fraud detection.
 */
create or replace function public.dhog_repeat_factor(p_prior_count int)
returns numeric
language sql
immutable
as $fn$
  select greatest(power(0.6::numeric, p_prior_count), 0.0);
$fn$;

-- Caps. Both are floors under abuse rather than everyday limits.
create or replace function public.dhog_unverified_daily_give_cap()
returns int language sql immutable as $fn$ select 20 $fn$;

create or replace function public.dhog_thread_daily_earn_cap()
returns numeric language sql immutable as $fn$ select 10.0::numeric $fn$;

create or replace function public.dhog_new_account_days()
returns int language sql immutable as $fn$ select 7 $fn$;

-- ---------------------------------------------------------------------------
-- Weight resolution, at write time.
--
-- This runs as a trigger rather than in application code because the client
-- holds an insert grant on reactions. It must not be able to choose its own
-- weight, so the weight columns have no insert grant at all and this is the
-- only thing that sets them.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_dhog_weight()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_receiver_id     uuid;
  v_thread_id       uuid;
  v_is_comment      boolean := new.comment_id is not null;
  v_post_type       public.post_type;
  v_content_niche   uuid;
  v_giver_niche     uuid;
  v_giver_verified  boolean := false;
  v_giver_created   timestamptz;
  v_giver_has_history boolean;
  v_tier            public.dhog_giver_tier;
  v_prior_pair      int;
  v_given_today     int;
  v_earned_in_thread numeric;
  v_weight          numeric;
begin
  -- Who receives it, which thread it belongs to, and what kind of thing it is.
  if v_is_comment then
    select c.author_id, c.post_id into v_receiver_id, v_thread_id
    from public.comments c where c.id = new.comment_id;
  else
    v_thread_id := new.post_id;
    select p.author_id into v_receiver_id from public.posts p where p.id = new.post_id;
  end if;

  select p.post_type, pr.niche_id
    into v_post_type, v_content_niche
  from public.posts p
  join public.spaces s on s.id = p.space_id
  join public.professional_profiles pr on pr.id = s.professional_id
  where p.id = v_thread_id;

  new.receiver_id := v_receiver_id;

  -- Giving dhog to yourself is worth nothing, always.
  if v_receiver_id is null or v_receiver_id = new.user_id then
    new.giver_weight_tier := 'no_weight';
    new.weight := 0;
    return new;
  end if;

  select u.created_at into v_giver_created from public.users u where u.id = new.user_id;

  select p.verification_status = 'verified', p.niche_id
    into v_giver_verified, v_giver_niche
  from public.professional_profiles p
  where p.user_id = new.user_id;

  v_giver_has_history := exists (select 1 from public.posts where author_id = new.user_id)
                      or exists (select 1 from public.comments where author_id = new.user_id);

  -- Tier.
  if coalesce(v_giver_verified, false) then
    v_tier := case
      when v_content_niche is not null and v_giver_niche = v_content_niche
        then 'verified_same_niche'
      else 'verified_other_niche'
    end;
  elsif v_giver_created > now() - make_interval(days => public.dhog_new_account_days())
        or not v_giver_has_history then
    -- Recorded so the UI stays responsive and their own count moves, but it
    -- contributes nothing to anybody's total.
    v_tier := 'no_weight';
  else
    v_tier := 'unverified';
  end if;

  v_weight := public.dhog_tier_weight(v_tier)
            * public.dhog_context_multiplier(v_is_comment, coalesce(v_post_type, 'discussion'));

  -- Diminishing returns for the same pair, rolling 30 days.
  select count(*) into v_prior_pair
  from public.reactions r
  where r.user_id = new.user_id
    and r.receiver_id = v_receiver_id
    and r.created_at > now() - interval '30 days';

  v_weight := v_weight * public.dhog_repeat_factor(v_prior_pair);

  -- Cap what an unverified account can hand out in a day.
  if v_tier in ('unverified', 'no_weight') then
    select count(*) into v_given_today
    from public.reactions r
    where r.user_id = new.user_id and r.created_at > now() - interval '1 day';

    if v_given_today >= public.dhog_unverified_daily_give_cap() then
      v_weight := 0;
    end if;
  end if;

  -- Cap what one person can earn from a single thread in a day.
  select coalesce(sum(r.weight), 0) into v_earned_in_thread
  from public.reactions r
  left join public.comments c on c.id = r.comment_id
  where r.receiver_id = v_receiver_id
    and r.created_at > now() - interval '1 day'
    and coalesce(r.post_id, c.post_id) = v_thread_id;

  v_weight := least(
    v_weight,
    greatest(public.dhog_thread_daily_earn_cap() - v_earned_in_thread, 0)
  );

  new.giver_weight_tier := v_tier;
  new.weight := round(greatest(v_weight, 0), 4);
  return new;
end;
$fn$;

create trigger reactions_resolve_dhog_weight
  before insert on public.reactions
  for each row execute function public.resolve_dhog_weight();

-- ---------------------------------------------------------------------------
-- Manual awards: hosting a counselling session or an event.
-- Admin-only, no automation, by design for now.
-- ---------------------------------------------------------------------------
create table public.dhog_awards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  kind       text not null default 'event' check (kind in ('event')),
  weight     numeric(8,4) not null check (weight >= 0),
  note       text,
  awarded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index dhog_awards_user_idx on public.dhog_awards (user_id, created_at desc);

create or replace function public.award_dhog(p_user_id uuid, p_note text default null)
returns public.dhog_awards
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_row public.dhog_awards;
begin
  if not public.is_admin() then
    raise exception 'only an admin can award dhog';
  end if;

  insert into public.dhog_awards (user_id, kind, weight, note, awarded_by)
  values (p_user_id, 'event', 8.0, p_note, auth.uid())
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- "Not helpful" — a private flag, not a reaction.
--
-- Entirely separate from public.reactions on purpose: it carries no weight, it
-- is never counted, other users cannot see it, and it cannot move anyone's
-- dhog. All it does is put the thing in front of a human.
-- ---------------------------------------------------------------------------
create type public.flag_status as enum ('open', 'actioned', 'dismissed');

create table public.flags (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  reason      text check (reason is null or length(btrim(reason)) <= 2000),
  status      public.flag_status not null default 'open',
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz not null default now(),
  constraint flags_one_target check ((post_id is not null) <> (comment_id is not null))
);

create unique index flags_unique_post on public.flags (reporter_id, post_id)
  where post_id is not null;
create unique index flags_unique_comment on public.flags (reporter_id, comment_id)
  where comment_id is not null;
create index flags_open_idx on public.flags (status, created_at desc);

/** Moderation, not scoring: hiding something never changes anybody's dhog. */
create or replace function public.resolve_flag(
  p_flag_id uuid,
  p_hide boolean,
  p_note text default null
)
returns public.flags
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_flag public.flags;
begin
  if not public.is_admin() then
    raise exception 'only an admin can resolve a flag';
  end if;

  select * into v_flag from public.flags where id = p_flag_id;
  if v_flag.id is null then
    raise exception 'flag not found';
  end if;

  if p_hide then
    if v_flag.post_id is not null then
      update public.posts set hidden_at = now() where id = v_flag.post_id;
    else
      update public.comments set hidden_at = now() where id = v_flag.comment_id;
    end if;
  end if;

  update public.flags
     set status = case when p_hide then 'actioned' else 'dismissed' end,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = p_note
   where id = p_flag_id
  returning * into v_flag;

  return v_flag;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Totals.
--
-- Two numbers, on purpose. Lifetime never decays and is the credential on a
-- profile; weekly is a rolling 7-day sum and is the only thing the leaderboard
-- reads, so the board stays winnable by someone who joined last month.
--
-- Plain views for now — no materialised views, no caching, until there is
-- enough traffic to justify either.
--
-- These views are owned by the migration role and are not security_invoker, so
-- they can aggregate columns that no client is granted to select. That is
-- deliberate: totals are public, the arithmetic behind them is not.
-- ---------------------------------------------------------------------------
create view public.dhog_ledger as
  select r.receiver_id as user_id, r.weight as amount, r.created_at
  from public.reactions r
  where r.weight > 0 and r.receiver_id is not null

  union all

  select a.user_id, a.weight, a.created_at
  from public.dhog_awards a;

create view public.dhog_lifetime as
  select user_id, round(sum(amount))::int as dhog
  from public.dhog_ledger
  group by user_id;

create view public.dhog_weekly as
  select user_id, round(sum(amount))::int as dhog
  from public.dhog_ledger
  where created_at > now() - interval '7 days'
  group by user_id;

-- ---------------------------------------------------------------------------
-- Grants and policies.
-- ---------------------------------------------------------------------------

-- A client may say "I am giving dhog to this". It may not say what that is
-- worth — the trigger decides, and the arithmetic is not readable.
revoke insert on public.reactions from authenticated;
grant insert (user_id, post_id, comment_id, type) on public.reactions to authenticated;

revoke select on public.reactions from anon, authenticated;
grant select (id, user_id, post_id, comment_id, type, receiver_id, created_at)
  on public.reactions to anon, authenticated;

grant select on public.dhog_lifetime to anon, authenticated;
grant select on public.dhog_weekly to anon, authenticated;
grant select on public.dhog_awards to anon, authenticated;

alter table public.flags       enable row level security;
alter table public.dhog_awards enable row level security;

revoke all on public.flags from anon, authenticated;
grant select, insert on public.flags to authenticated;

-- Yours alone. A flag is private between the reporter and the moderators.
create policy flags_select_own on public.flags
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy flags_insert_own on public.flags
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy dhog_awards_select_all on public.dhog_awards
  for select using (true);

-- Hidden content drops out of the public read, but stays visible to its author
-- and to admins.
drop policy posts_select_all on public.posts;
create policy posts_select_visible on public.posts
  for select
  using (hidden_at is null or author_id = auth.uid() or public.is_admin());

drop policy comments_select_all on public.comments;
create policy comments_select_visible on public.comments
  for select
  using (hidden_at is null or author_id = auth.uid() or public.is_admin());

-- Restated so the intent is on the record: a post is editable by its author
-- and nobody else.
drop policy posts_update_author on public.posts;
create policy posts_update_author on public.posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
