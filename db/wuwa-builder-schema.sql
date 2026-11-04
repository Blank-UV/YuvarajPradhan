-- Build/Show reference data only. Run after wuwa-schema.sql and wuwa-weapons-schema.sql.
-- Do not put player UIDs, equipment rolls, or saved builds in these public tables.

create table if not exists wuwa_builder_characters (
  character_slug text not null references wuwa_characters (slug) on delete cascade,
  game_id integer not null,
  portrait_path text,
  element_icon_path text,
  -- Source level-1 stats use hundredths for Crit, CritDamage and EnergyEfficiency.
  base_stats jsonb,
  -- [{level, ascension, hp, atk, def}]; includes pre-/post-ascension boundary rows.
  level_stats jsonb not null default '[]'::jsonb check (jsonb_typeof(level_stats) = 'array'),
  -- [{kind, name, icon_path, multipliers: [{name, values: [[Lv1, ..., Lv10]]}]}]
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  sequences jsonb not null default '[]'::jsonb check (jsonb_typeof(sequences) = 'array'),
  source_url text not null,
  fetched_at timestamptz not null,
  primary key (character_slug, game_id)
);

create table if not exists wuwa_builder_weapons (
  weapon_slug text primary key references wuwa_weapons (slug) on delete cascade,
  game_id integer not null unique,
  sub_stat text not null,
  sub_is_percent boolean not null,
  -- Percent sub_value is a displayed percentage, e.g. 72, not 0.72 or 7200.
  level_stats jsonb not null check (jsonb_typeof(level_stats) = 'array'),
  -- Each entry contains one passive parameter's values at R1 through R5.
  -- These are not unconditional stat bonuses; reuse wuwa_weapons.syntony for text.
  rank_parameters jsonb not null check (jsonb_typeof(rank_parameters) = 'array'),
  source_url text not null,
  fetched_at timestamptz not null
);

create table if not exists wuwa_builder_rules (
  key text primary key check (key in (
    'stat_definitions', 'echo_main_stats', 'echo_substats', 'echo_growth'
  )),
  data jsonb not null,
  sources jsonb not null check (jsonb_typeof(sources) = 'array'),
  fetched_at timestamptz not null
);

alter table wuwa_builder_characters enable row level security;
alter table wuwa_builder_weapons enable row level security;
alter table wuwa_builder_rules enable row level security;

drop policy if exists "public read" on wuwa_builder_characters;
drop policy if exists "public read" on wuwa_builder_weapons;
drop policy if exists "public read" on wuwa_builder_rules;
create policy "public read" on wuwa_builder_characters for select using (true);
create policy "public read" on wuwa_builder_weapons for select using (true);
create policy "public read" on wuwa_builder_rules for select using (true);

-- Paths are relative to the existing public WutheringWaves Storage bucket:
-- builder/portraits/<slug>-<game_id>.png
-- builder/skills/<source-filename>.png
-- builder/sequences/<source-filename>.png
-- builder/elements/<source-filename>.png
-- builder/stats/<source-filename>.png
-- No public INSERT, UPDATE, or DELETE policy is created.
