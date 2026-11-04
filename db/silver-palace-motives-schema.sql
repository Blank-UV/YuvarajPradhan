-- Silver Palace motives (Supabase / Postgres). Additive: run after db/silver-palace-schema.sql;
-- safe to re-run. The seed file (sp-data/seed/sp-motives.sql) fills the tables.
--
--   sp_motives        one row per motive (a character's equippable item: base stats, skill, lore)
--     sp_motive_ranks   the skill text at each rank R1 - R5                (1 row per rank)
--
-- A motive's identity (Hero, Outlaw, ...) points at sp_traits, the same lookup characters use, so
-- "which motives fit which characters" can be answered with a join on identity_id.
-- Icons are paths inside the public "SilverPalace" Storage bucket, for example
-- motives/t_icon_characterweapon_12051001.webp.

create table if not exists sp_motives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  -- The game's own id; the only stable key, because two motives can share a name.
  source_id integer not null unique,
  name text not null,
  rarity smallint not null check (rarity between 1 and 5),
  identity_id uuid references sp_traits (id) on delete set null,
  skill_name text,
  base_hp integer,
  base_atk integer,
  -- Each motive adds one extra stat: label and value as published ("Crit Rate", "+0.5%").
  bonus_stat text,
  bonus_value text,
  -- Skill text at rank 1 (the other ranks are in sp_motive_ranks).
  description text,
  lore text,
  image_path text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sp_motives is 'Motives: equippable items with base stats, a rank 1-5 skill and lore.';
create index if not exists sp_motives_identity_idx on sp_motives (identity_id);

create table if not exists sp_motive_ranks (
  motive_id uuid not null references sp_motives (id) on delete cascade,
  rank smallint not null check (rank between 1 and 5),
  description text not null,
  primary key (motive_id, rank)
);
comment on table sp_motive_ranks is 'Motive skill text at each rank (R1 to R5).';

drop trigger if exists sp_motives_touch on sp_motives;
create trigger sp_motives_touch before update on sp_motives
  for each row execute function sp_touch_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['sp_motives', 'sp_motive_ranks'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
