-- Wuthering Waves echoes (Supabase / Postgres). Run once in the SQL editor; safe to re-run.

create table if not exists wuwa_echoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  -- Game8's echo number, for example H26.
  number text,
  cost smallint check (cost in (1, 3, 4)),
  class text check (class is null or class in ('Calamity', 'Overlord', 'Elite', 'Common')),
  -- Relative to the "WutheringWaves" Storage bucket, for example echoes/thundering-mephis.png.
  image_path text,
  -- Possible main stats at level 25: [{ "stat": "ATK%", "value": "33.0%", "fixed": true }]
  main_stats jsonb not null default '[]'::jsonb,
  -- Substat ranges: [{ "stat": "Crit Rate", "range": "6.3% - 10.5%" }]
  sub_stats jsonb not null default '[]'::jsonb,
  skill_text text,
  skill_rank text,
  cooldown numeric(6, 1),
  -- [{ "name": "Void Thunder", "slug": "void-thunder" }] (slugs match wuwa_sonata_effects)
  sonata_effects jsonb not null default '[]'::jsonb,
  -- [{ "title": "Obtained by Defeating Aero Drake", "text": ["..."], "rows": ["..."] }]
  where_to_get jsonb not null default '[]'::jsonb,
  drops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function wuwa_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists wuwa_echoes_touch on wuwa_echoes;
create trigger wuwa_echoes_touch before update on wuwa_echoes
  for each row execute function wuwa_touch_updated_at();

alter table wuwa_echoes enable row level security;
drop policy if exists "public read" on wuwa_echoes;
create policy "public read" on wuwa_echoes for select using (true);
