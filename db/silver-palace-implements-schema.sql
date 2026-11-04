-- Silver Palace implements (Supabase / Postgres). Additive: run after db/silver-palace-schema.sql;
-- safe to re-run. The seed file (sp-data/seed/sp-implements.sql) fills the tables.
--
--   sp_implements          one row per 4-piece set: set effect, lore, rarity, icon
--     sp_implement_pieces    the pieces of a set, in display order
--       sp_implement_stats     one row per stat per level (20/40/60/70/80), in display order
--
-- Icons are paths inside the public "SilverPalace" Storage bucket, for example
-- implements/t_itemlarge_equipment_71201164.webp.

create table if not exists sp_implements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  -- The site's own id; the stable key.
  source_id integer not null unique,
  name text not null,
  rarity smallint not null check (rarity between 1 and 5),
  type text not null default 'Implement',
  description text,
  lore text,
  max_stack integer,
  image_path text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sp_implements is 'Implements: four-piece equipment sets with a set effect.';
comment on column sp_implements.sources is 'Where the data was collected, for example [{"name": "Hideout Guides", "url": "https://..."}].';

create table if not exists sp_implement_pieces (
  id uuid primary key default gen_random_uuid(),
  implement_id uuid not null references sp_implements (id) on delete cascade,
  position smallint not null,
  name text not null,
  image_path text,
  unique (implement_id, position)
);
comment on table sp_implement_pieces is 'One piece of an implement set; position is the display order.';

create table if not exists sp_implement_stats (
  piece_id uuid not null references sp_implement_pieces (id) on delete cascade,
  position smallint not null,
  level smallint not null,
  label text not null,
  -- The value as published ("3.16%", "698") and its number.
  value text not null,
  num numeric,
  primary key (piece_id, position, level)
);
comment on table sp_implement_stats is 'A stat of an implement piece at one level; position is the stat order.';

drop trigger if exists sp_implements_touch on sp_implements;
create trigger sp_implements_touch before update on sp_implements
  for each row execute function sp_touch_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['sp_implements', 'sp_implement_pieces', 'sp_implement_stats'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
