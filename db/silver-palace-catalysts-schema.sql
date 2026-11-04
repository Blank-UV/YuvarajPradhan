-- Silver Palace catalysts (Supabase / Postgres). Additive: run after db/silver-palace-schema.sql;
-- safe to re-run. The seed file (sp-data/seed/sp-catalysts.sql) fills the tables.
--
--   sp_catalysts          one row per catalyst: effect text, rarity, max stack, icon
--     sp_catalyst_sources   where it comes from ("Boutique", "Riverside", ...), in display order
--
-- Several catalysts share one icon, so image_path is not unique. Icons are paths inside the public
-- "SilverPalace" Storage bucket, for example catalysts/icon_gem_009.webp.

create table if not exists sp_catalysts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  -- The game's own id; the stable key.
  source_id integer not null unique,
  name text not null,
  rarity smallint not null check (rarity between 1 and 5),
  type text not null default 'Catalysts',
  description text,
  max_stack integer,
  image_path text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table sp_catalysts is 'Catalysts: items with a timed effect, a rarity and a stack limit.';
comment on column sp_catalysts.sources is 'Where the data was collected, for example [{"name": "Hideout Guides", "url": "https://..."}].';

create table if not exists sp_catalyst_sources (
  catalyst_id uuid not null references sp_catalysts (id) on delete cascade,
  position smallint not null,
  name text not null,
  primary key (catalyst_id, position)
);
comment on table sp_catalyst_sources is 'Where a catalyst is obtained (shop, stage, quest, ...); position is the display order.';
create index if not exists sp_catalyst_sources_name_idx on sp_catalyst_sources (name);

drop trigger if exists sp_catalysts_touch on sp_catalysts;
create trigger sp_catalysts_touch before update on sp_catalysts
  for each row execute function sp_touch_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['sp_catalysts', 'sp_catalyst_sources'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
