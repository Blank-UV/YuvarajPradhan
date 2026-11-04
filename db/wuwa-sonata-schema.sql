-- Wuthering Waves sonata effects (echo sets) (Supabase / Postgres). Run once in the SQL editor; safe to re-run.

create table if not exists wuwa_sonata_effects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  -- Element the set is built around, or null for general sets (healing, ATK, energy regen...).
  element text check (element is null or element in ('Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro')),
  -- Relative to the "WutheringWaves" Storage bucket, for example sonata/celestial-light.png.
  image_path text,
  -- [{ "pieces": 2, "text": "Spectro DMG +10%." }, { "pieces": 5, "text": "..." }]
  bonuses jsonb not null default '[]'::jsonb,
  best_characters jsonb not null default '[]'::jsonb,
  optional_characters jsonb not null default '[]'::jsonb,
  -- { "4": [{ "stat": "Crit Rate", "priority": "lock" }], "3": [...], "1": [...] }; priority is lock, optional or discard.
  main_stats jsonb not null default '{}'::jsonb,
  -- [{ "title": "Whining Aix's Mire Tacet Field", "text": ["..."], "rows": ["..."] }]
  where_to_get jsonb not null default '[]'::jsonb,
  -- [{ "name": "Mourning Aix", "cost": 4 }]
  echoes jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function wuwa_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists wuwa_sonata_effects_touch on wuwa_sonata_effects;
create trigger wuwa_sonata_effects_touch before update on wuwa_sonata_effects
  for each row execute function wuwa_touch_updated_at();

alter table wuwa_sonata_effects enable row level security;
drop policy if exists "public read" on wuwa_sonata_effects;
create policy "public read" on wuwa_sonata_effects for select using (true);
