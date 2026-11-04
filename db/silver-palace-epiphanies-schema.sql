-- Silver Palace epiphanies (Supabase / Postgres). Additive: run after db/silver-palace-schema.sql;
-- safe to re-run. The seed file (sp-data/seed/sp-epiphanies.sql) fills the tables.
--
--   sp_epiphanies           one row per epiphany (equipment): main stat, level, effect text, lore
--     sp_epiphany_substats    its three substats, in display order        (1 row per substat)
--   sp_epiphany_addendums   the possible addendums of any-character Ink (one shared list)
--
-- Stats are stored as published ("+19.5%") with the label, number and unit split out, the same way
-- sp_skill_scaling does, so they can be filtered and sorted ("highest CRIT Rate substat").
-- Icons are paths inside the public "SilverPalace" Storage bucket, for example
-- epiphanies/icon_equipment_72205015.webp.

create table if not exists sp_epiphanies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  -- The game's own id; the stable key.
  source_id integer not null unique,
  name text not null,
  rarity smallint not null check (rarity between 1 and 5),
  type text not null default 'Epiphany',
  -- Level the listed stats are quoted for.
  level smallint,
  main_stat_label text,
  main_stat_value text,
  main_stat_num numeric,
  main_stat_unit text,
  description text,
  lore text,
  image_path text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sp_epiphanies is 'Epiphanies: equipment with a main stat, three substats, an effect and lore.';

create table if not exists sp_epiphany_substats (
  epiphany_id uuid not null references sp_epiphanies (id) on delete cascade,
  position smallint not null,
  label text not null,
  value text,
  value_num numeric,
  unit text,
  primary key (epiphany_id, position)
);
comment on table sp_epiphany_substats is 'Substats of an epiphany; position is the display order.';

-- Possible addendums are the same for every epiphany (any-character Ink: the stat an Ink can add
-- and its maximum), so they are one shared list rather than rows per epiphany.
create table if not exists sp_epiphany_addendums (
  position smallint primary key,
  label text not null,
  value text,
  value_num numeric,
  unit text
);
comment on table sp_epiphany_addendums is 'Possible addendums of any-character Ink: stat and maximum value, in display order.';

drop trigger if exists sp_epiphanies_touch on sp_epiphanies;
create trigger sp_epiphanies_touch before update on sp_epiphanies
  for each row execute function sp_touch_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['sp_epiphanies', 'sp_epiphany_substats', 'sp_epiphany_addendums'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
