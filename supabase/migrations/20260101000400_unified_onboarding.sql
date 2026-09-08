-- ===========================================================================
-- One signup, one onboarding.
--
-- There is no longer a learner door and a professional door. Everyone signs up
-- the same way and answers the same three steps; adding a LinkedIn URL is an
-- optional extra offered to all of them, and it drops the account into exactly
-- the same pending-review state the professional application already used.
--
-- The wizard collects two things that had nowhere to live (how someone
-- describes themselves, and what they want out of the place) plus an optional
-- first contribution. They go in their own table rather than on public.users
-- because public.users is world-readable by design — see the select grant in
-- the RLS migration — and none of this is anybody else's business.
-- ===========================================================================

create table public.onboarding_responses (
  user_id           uuid primary key references public.users (id) on delete cascade,

  -- Descriptive only. Nothing branches on this, and it grants nothing.
  self_description  text
    check (self_description in ('professional', 'student', 'looking')),

  -- Multi-select: 'answers' (here to ask), 'share' (here to answer), or both.
  goals             text[] not null default '{}'
    check (goals <@ array['answers', 'share']),

  -- Step 3's draft. Posts still belong to a verified professional's space, so
  -- a brand-new account has nowhere to publish yet; parking the text here
  -- means it is not thrown away. Drain this into public.posts once posts can
  -- be authored by anyone.
  first_action_kind text check (first_action_kind in ('question', 'intro')),
  first_action_text text
    check (first_action_text is null or length(btrim(first_action_text)) between 1 and 8000),

  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger onboarding_responses_touch_updated_at
  before update on public.onboarding_responses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: yours and yours alone, plus admins who need to read the review queue's
-- context. Nothing here is public.
-- ---------------------------------------------------------------------------
alter table public.onboarding_responses enable row level security;

revoke all on public.onboarding_responses from anon, authenticated;

grant select, insert, update on public.onboarding_responses to authenticated;

create policy onboarding_responses_select_own on public.onboarding_responses
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy onboarding_responses_insert_own on public.onboarding_responses
  for insert to authenticated
  with check (user_id = auth.uid());

create policy onboarding_responses_update_own on public.onboarding_responses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
