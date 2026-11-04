-- Wuthering Waves character data (Supabase / Postgres). Run once in the SQL editor.

create table if not exists wuwa_characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  rarity smallint not null check (rarity in (4, 5)),
  element text not null check (element in ('Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro')),
  weapon_type text not null check (weapon_type in ('Broadblade', 'Sword', 'Pistols', 'Gauntlets', 'Rectifier')),
  image_path text,
  is_new boolean not null default false,
  release_version text,
  -- Level 90 base stats.
  hp integer,
  atk integer,
  def integer,
  max_energy integer,
  crit_rate numeric(5, 2),
  crit_dmg numeric(6, 2),
  healing_bonus numeric(5, 2),
  element_dmg_bonus numeric(5, 2),
  -- [{ "stat": "Aero DMG", "value": 12 }, { "stat": "ATK%", "value": 12 }]
  minor_fortes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wuwa_character_skills (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references wuwa_characters (id) on delete cascade,
  tab text not null check (tab in ('active', 'passive', 'concerto')),
  -- Basic Attack, Resonance Skill, Resonance Liberation, Forte Circuit,
  -- Inherent Skill, Intro Skill, Outro Skill
  kind text not null,
  name text not null,
  description text,
  -- [{ "label": "Heavy Attack", "text": "..." }]
  entries jsonb not null default '[]'::jsonb,
  multipliers jsonb,
  sort_order smallint not null default 0
);

create table if not exists wuwa_character_sequences (
  character_id uuid not null references wuwa_characters (id) on delete cascade,
  node smallint not null check (node between 1 and 6),
  name text not null,
  description text not null,
  primary key (character_id, node)
);

create index if not exists wuwa_character_skills_character_idx on wuwa_character_skills (character_id);

-- Upgrade materials (ascension, skill and forte upgrades).
create table if not exists wuwa_character_materials (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references wuwa_characters (id) on delete cascade,
  category text not null check (category in ('ascension', 'skill', 'forte')),
  name text not null,
  quantity integer,
  sort_order smallint not null default 0
);
create index if not exists wuwa_character_materials_character_idx on wuwa_character_materials (character_id);

alter table wuwa_characters add column if not exists updated_at timestamptz not null default now();

-- Formatted skill / sequence text: [{ "type": "title", "text": "Basic Attack" },
-- { "type": "p", "runs": [{ "t": "text", "v": "Perform up to 4 attacks, dealing " },
-- { "t": "el", "e": "Electro", "v": "Electro DMG" }, { "t": "hl", "v": "Normal Attack" }] }]
alter table wuwa_character_skills add column if not exists body jsonb;
alter table wuwa_character_sequences add column if not exists body jsonb;

create or replace function wuwa_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists wuwa_characters_touch on wuwa_characters;
create trigger wuwa_characters_touch before update on wuwa_characters
  for each row execute function wuwa_touch_updated_at();

-- Public read-only access for the site. Writes require the service role (SQL editor / dashboard).
alter table wuwa_characters enable row level security;
alter table wuwa_character_skills enable row level security;
alter table wuwa_character_sequences enable row level security;
alter table wuwa_character_materials enable row level security;

drop policy if exists "public read" on wuwa_characters;
drop policy if exists "public read" on wuwa_character_skills;
drop policy if exists "public read" on wuwa_character_sequences;
drop policy if exists "public read" on wuwa_character_materials;
create policy "public read" on wuwa_characters for select using (true);
create policy "public read" on wuwa_character_skills for select using (true);
create policy "public read" on wuwa_character_sequences for select using (true);
create policy "public read" on wuwa_character_materials for select using (true);

-- Character art lives in a public Storage bucket named "WutheringWaves"; image_path is relative to it,
-- for example characters/aalto.png.
