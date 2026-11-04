-- Wuthering Waves weapon data (Supabase / Postgres). Run once in the SQL editor; safe to re-run.

create table if not exists wuwa_weapons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  rarity smallint not null check (rarity between 1 and 5),
  weapon_type text not null check (weapon_type in ('Broadblade', 'Sword', 'Pistols', 'Gauntlets', 'Rectifier')),
  -- Relative to the "WutheringWaves" Storage bucket, for example weapons/abyss-surges.png.
  image_path text,
  -- Level 90 base stats.
  atk integer,
  sub_stat text,
  sub_value text,
  skill_name text,
  skill_text text,
  -- Highest level the stats below are quoted for (90 for most; 60 for the starter weapons).
  max_level smallint not null default 90,
  -- Rank 1 to 5 skill effect text: ["...", "...", "...", "...", "..."]
  syntony jsonb not null default '[]'::jsonb,
  -- [{ "level": 1, "atk": 47, "sub": "8.1%" }]
  levels jsonb not null default '[]'::jsonb,
  lore text,
  -- [{ "name": "Jianxin", "rarity": 5, "element": "Aero" }]
  recommended jsonb not null default '[]'::jsonb,
  obtain text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wuwa_weapons add column if not exists max_level smallint not null default 90;

create or replace function wuwa_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists wuwa_weapons_touch on wuwa_weapons;
create trigger wuwa_weapons_touch before update on wuwa_weapons
  for each row execute function wuwa_touch_updated_at();

alter table wuwa_weapons enable row level security;
drop policy if exists "public read" on wuwa_weapons;
create policy "public read" on wuwa_weapons for select using (true);
