-- ===========================================================================
-- Niche seed.
--
-- One niche only: tech. Opening the next one is a single insert here plus a
-- decision about who gets verified in it — nothing in the app is hardcoded
-- to "tech", it just reads whatever is active.
-- ===========================================================================

insert into public.niches (slug, name, tagline, description, emoji, accent, is_active, sort_order)
values (
  'tech',
  'Tech',
  'Engineers, designers, founders, and data people building software from Nepal.',
  'People who write, ship, and maintain software for a living — in Kathmandu, in Pokhara, and abroad. Ask them about breaking in, levelling up, and what the job is actually like.',
  '💻',
  '#C8102E',
  true,
  1
)
on conflict (slug) do nothing;
