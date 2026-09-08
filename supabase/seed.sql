-- ===========================================================================
-- Local development seed. Runs on `supabase db reset` only.
--
-- Creates a handful of demo accounts so the landing page, a niche page, and a
-- space all have something in them. Every account's password is `password`.
--
--   admin@sathi.test        admin, can open /admin/review
--   aayusha@sathi.test      verified professional (founding member)
--   bibek@sathi.test        verified professional (founding member)
--   prakriti@sathi.test     verified professional (founding member)
--   sandesh@sathi.test      PENDING professional — sits in the review queue
--   nirjala@sathi.test      student
--
-- Do not run this against a production project.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Auth users. public.users rows appear via the on_auth_user_created trigger.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@sathi.test',     crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sathi Admin"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'aayusha@sathi.test',   crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aayusha Shrestha"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'bibek@sathi.test',     crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bibek Gurung"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'prakriti@sathi.test',  crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Prakriti Rai"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'sandesh@sathi.test',   crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sandesh Thapa"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'nirjala@sathi.test',   crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nirjala Karki"}')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  json_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true)::jsonb,
  'email',
  now(), now(), now()
from auth.users u
where u.email like '%@sathi.test'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
update public.users set role = 'admin', onboarded = true
  where id = 'a0000000-0000-4000-8000-000000000001';

update public.users set role = 'professional', onboarded = true
  where id in (
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000004'
  );

update public.users set onboarded = true
  where id = 'a0000000-0000-4000-8000-000000000006';

-- ---------------------------------------------------------------------------
-- Professional profiles
-- ---------------------------------------------------------------------------
insert into public.professional_profiles (
  id, user_id, display_name, headline, bio, linkedin_url, niche_id,
  verification_status, founding_member, links, reviewed_at, reviewed_by
)
values
    (
      'b0000000-0000-4000-8000-000000000002'::uuid,
      'a0000000-0000-4000-8000-000000000002'::uuid,
      'Aayusha Shrestha',
      'Senior Backend Engineer · Kathmandu',
      E'Eight years writing Go and Python, most of it on payments infrastructure. Started at a five-person outsourcing shop in Kupondole, now leading a team of nine.\n\nI care a lot about the gap between what CS students in Nepal are taught and what the first job actually asks of them. Ask me about that gap — I fell straight into it.',
      'https://linkedin.com/in/aayusha-shrestha-demo',
      (select id from public.niches where slug = 'tech'),
      'verified'::public.verification_status,
      true,
      '[{"label":"GitHub","url":"https://github.com/"},{"label":"Notes on distributed systems","url":"https://example.com/notes"}]'::jsonb,
      now(),
      'a0000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'b0000000-0000-4000-8000-000000000003'::uuid,
      'a0000000-0000-4000-8000-000000000003'::uuid,
      'Bibek Gurung',
      'Product Designer · fintech, Lalitpur',
      E'I design consumer fintech for people who have never used a bank app before. Six years in, three of them remote for a team in Singapore.\n\nI did not study design. I studied civil engineering in Pulchowk and drew interfaces at night until someone paid me for it.',
      'https://linkedin.com/in/bibek-gurung-demo',
      (select id from public.niches where slug = 'tech'),
      'verified'::public.verification_status,
      true,
      '[{"label":"Portfolio","url":"https://example.com/portfolio"}]'::jsonb,
      now(),
      'a0000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'b0000000-0000-4000-8000-000000000004'::uuid,
      'a0000000-0000-4000-8000-000000000004'::uuid,
      'Prakriti Rai',
      'Data Scientist · Dharan → Berlin',
      E'I do applied ML for a logistics company in Berlin. Before that: four years in Kathmandu doing analytics nobody called ML, which turned out to be the part that mattered.\n\nHappy to talk about applying abroad from Nepal without a referral, and about how much of "data science" is actually SQL.',
      'https://linkedin.com/in/prakriti-rai-demo',
      (select id from public.niches where slug = 'tech'),
      'verified'::public.verification_status,
      true,
      '[]'::jsonb,
      now(),
      'a0000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'b0000000-0000-4000-8000-000000000005'::uuid,
      'a0000000-0000-4000-8000-000000000005'::uuid,
      'Sandesh Thapa',
      'Founder / CTO',
      null,
      'https://linkedin.com/in/sandesh-thapa-demo',
      (select id from public.niches where slug = 'tech'),
      'pending'::public.verification_status,
      false,
      '[]'::jsonb,
      null,
      null
    )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Spaces for the verified three
-- ---------------------------------------------------------------------------
insert into public.spaces (id, professional_id, slug, headline)
values
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'aayusha-shrestha', 'Backend, payments, and the first-job gap'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'bibek-gurung',     'Design without a design degree'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'prakriti-rai',     'Data work, and getting out without a referral')
on conflict (professional_id) do nothing;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
insert into public.posts (id, space_id, author_id, content, kind, created_at)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    E'Introducing myself: eight years backend, mostly Go, mostly payments. I started at a five-person shop in Kupondole where I was the entire "server team".\n\nOne piece of advice I wish someone had given me: your first job in Nepal will probably not be at a company you have heard of, and that is completely fine. What matters is whether there is one person there who reviews your code seriously. I stayed two years at a place with a bad salary because a senior named Rajesh tore apart every pull request I opened. That was worth more than the three job offers I turned down.\n\nAsk me anything about backend work here.',
    'intro',
    now() - interval '9 days'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    E'A thing I keep seeing in CVs from students: eleven projects, all of them tutorials, none of them deployed.\n\nOne project that is actually running somewhere, that a stranger has used, beats all eleven. It does not need to be clever. A form that saves to a database and has been up for six months tells me you have dealt with a server dying at 2am. That is the skill.',
    'post',
    now() - interval '5 days'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    E'Introducing myself: I design fintech apps, and I came in through civil engineering at Pulchowk.\n\nAdvice I wish I had gotten: stop waiting to be allowed. Nobody in Nepal was going to hand a civil engineering graduate a design job, so for a year I redesigned real Nepali apps — eSewa, the Nepal Telecom portal, my college website — and wrote up why I changed what I changed. That folder of unpaid work is the only reason I got my first interview. The write-up mattered more than the pixels.',
    'intro',
    now() - interval '7 days'
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000004',
    E'Introducing myself: data scientist in Berlin, from Dharan, four years in Kathmandu first.\n\nThe advice I needed at 22: you do not need a referral, you need a reason for someone to reply. I sent maybe 200 cold applications from Nepal and got nothing. What finally worked was writing publicly about a messy logistics dataset for three months. The company that hired me found the posts. Nobody introduced us.\n\nAlso: it is mostly SQL. Genuinely, mostly SQL.',
    'intro',
    now() - interval '3 days'
  ),
  (
    'd0000000-0000-4000-8000-000000000005',
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    E'Someone asked me yesterday whether they should do a paid UI/UX bootcamp in Kathmandu.\n\nMy honest answer: only if you already have three finished projects and you are stuck on getting feedback. Bootcamps are good at feedback and bad at motivation. If you have not finished anything on your own yet, the bootcamp will not fix that — it will just cost you 40,000 rupees to discover it.',
    'post',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- A comment and a couple of reactions, so threads are not empty
-- ---------------------------------------------------------------------------
insert into public.comments (id, post_id, author_id, content, created_at)
values
  (
    'e0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000006',
    'This is the first time anyone has told me a number for "how many projects is enough". Thank you — I have been adding tutorial projects for a year because I thought the count mattered.',
    now() - interval '4 days'
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'The count never mattered. Pick the one you liked most, deploy it this week, and send me the link.',
    now() - interval '4 days' + interval '2 hours'
  )
on conflict (id) do nothing;

insert into public.reactions (user_id, post_id, type)
values
  ('a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'helpful'),
  ('a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004', 'helpful'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'helpful')
on conflict do nothing;

insert into public.follows (follower_id, professional_id)
values
  ('a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004')
on conflict do nothing;

insert into public.user_niches (user_id, niche_id)
select 'a0000000-0000-4000-8000-000000000006', id from public.niches where slug = 'tech'
on conflict do nothing;
