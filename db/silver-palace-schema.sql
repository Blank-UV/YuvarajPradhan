-- Silver Palace character data (Supabase / Postgres).
-- Run once in the SQL editor; safe to re-run. Seed files (sp-data/seed/sp-NN.sql) fill the tables.
--
-- Structure (everything is prefixed sp_ so several games can share one database):
--
--   sp_traits              lookup: attribute, combat style, identity and faction (name + icon)
--   sp_characters          one row per character; points at its four traits
--     sp_character_stats        base HP / ATK / DEF at each level           (1 row per level)
--     sp_character_gifts        preferred gifts, in display order           (links to sp_gifts)
--     sp_character_trust_levels trust EXP needed and rewards per level      (1 row per level)
--     sp_character_skills       Basic Attack, Skill, Ultimate, Tactical Assault, Passive
--       sp_skill_scaling          damage / effect numbers per skill level   (1 row per value)
--     sp_character_psyches      P1 - P6 (unlocked through duplicates)
--   sp_gifts               lookup: gift items (name + icon), shared between characters
--
-- Image columns hold a path inside the public "SilverPalace" Storage bucket, for example
-- characters/cinderella/icon.webp. The API turns them into full URLs.
-- Later additions (builds, teams, weapons, ...) get their own sp_* tables that reference sp_characters.

create or replace function sp_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Lookups --------------------------------------------------------------------------------------

create table if not exists sp_traits (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('attribute', 'combat_style', 'identity', 'faction')),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);
comment on table sp_traits is 'Shared character labels: attribute (Ignis), combat style (Striker DPS), identity (Outlaw), faction (Fableborne).';

create table if not exists sp_gifts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sp_gifts is 'Gift items characters can receive; characters link to them through sp_character_gifts.';

-- Characters -----------------------------------------------------------------------------------

create table if not exists sp_characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  title text,
  weapon text,
  rarity smallint not null check (rarity between 1 and 5),
  accent_color text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  attribute_id uuid references sp_traits (id) on delete set null,
  combat_style_id uuid references sp_traits (id) on delete set null,
  identity_id uuid references sp_traits (id) on delete set null,
  faction_id uuid references sp_traits (id) on delete set null,
  -- Square icon for cards and the tall banner for the profile page.
  image_path text,
  banner_path text,
  sort_order integer not null default 0,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column sp_characters.title is 'In-game title shown next to the name, for example "Maid" or "Detective".';
comment on column sp_characters.sources is 'Where the data was collected, for example [{"name": "Hideout Guides", "url": "https://..."}].';
create index if not exists sp_characters_traits_idx
  on sp_characters (attribute_id, combat_style_id, identity_id, faction_id);

create table if not exists sp_character_stats (
  character_id uuid not null references sp_characters (id) on delete cascade,
  level smallint not null check (level > 0),
  hp integer not null,
  atk integer not null,
  def integer not null,
  primary key (character_id, level)
);
comment on table sp_character_stats is 'Base stats at each listed character level, before gear.';

create table if not exists sp_character_gifts (
  character_id uuid not null references sp_characters (id) on delete cascade,
  gift_id uuid not null references sp_gifts (id) on delete cascade,
  position smallint not null,
  primary key (character_id, gift_id)
);
comment on table sp_character_gifts is 'Preferred gifts of a character; position is the display order.';

create table if not exists sp_character_trust_levels (
  character_id uuid not null references sp_characters (id) on delete cascade,
  level smallint not null check (level > 0),
  -- Null at the final level, which has no further EXP requirement.
  exp integer,
  running_total integer not null,
  gifts_required integer not null default 0,
  -- [{ "name": "Ounce", "quantity": 5000 }]
  rewards jsonb not null default '[]'::jsonb,
  primary key (character_id, level)
);
comment on table sp_character_trust_levels is 'Trust level progression: EXP needed for the level, cumulative EXP, gifts needed and rewards.';

create table if not exists sp_character_skills (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references sp_characters (id) on delete cascade,
  position smallint not null,
  -- Short button label used by the game: ATK, SKL, ULT, TAC, PAS.
  code text not null check (code in ('ATK', 'SKL', 'ULT', 'TAC', 'PAS')),
  name text not null,
  kind text,
  image_path text,
  -- Description as ordered blocks: [{ "type": "text" | "heading" | "note", "text": "..." }]
  description jsonb not null default '[]'::jsonb,
  unique (character_id, position)
);
comment on table sp_character_skills is 'A character''s five skills, in display order.';

create table if not exists sp_skill_scaling (
  skill_id uuid not null references sp_character_skills (id) on delete cascade,
  level smallint not null check (level > 0),
  -- Order of the value inside the skill's table (a skill lists several values per level).
  position smallint not null,
  label text not null,
  -- Exactly as published ("124%", "12s"), plus the number and unit split out for sorting and maths.
  value text not null,
  value_num numeric,
  unit text,
  primary key (skill_id, level, position)
);
comment on table sp_skill_scaling is 'Skill numbers per skill level, one row per value: skill 1st-hit DMG at level 20 = 124%.';

create table if not exists sp_character_psyches (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references sp_characters (id) on delete cascade,
  position smallint not null,
  -- P1 to P6, unlocked through duplicates.
  badge text not null,
  name text not null,
  description text not null,
  image_path text,
  unique (character_id, position)
);
comment on table sp_character_psyches is 'Psyches (duplicate upgrades) of a character.';

-- Updated-at triggers --------------------------------------------------------------------------

drop trigger if exists sp_traits_touch on sp_traits;
create trigger sp_traits_touch before update on sp_traits
  for each row execute function sp_touch_updated_at();
drop trigger if exists sp_gifts_touch on sp_gifts;
create trigger sp_gifts_touch before update on sp_gifts
  for each row execute function sp_touch_updated_at();
drop trigger if exists sp_characters_touch on sp_characters;
create trigger sp_characters_touch before update on sp_characters
  for each row execute function sp_touch_updated_at();

-- Public read-only access (the website reads with the publishable key) -------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'sp_traits', 'sp_gifts', 'sp_characters', 'sp_character_stats', 'sp_character_gifts',
    'sp_character_trust_levels', 'sp_character_skills', 'sp_skill_scaling', 'sp_character_psyches'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
