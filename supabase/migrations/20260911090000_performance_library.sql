-- Performance library, count-in, and device health.
-- Does not replace control_beat_session; PLAY/PAUSE/STOP stay on the existing RPC.

alter type public.event_type add value if not exists 'song_change';
alter type public.event_type add value if not exists 'count_in_change';

create type public.song_section_kind as enum (
  'intro',
  'verse',
  'pre_chorus',
  'chorus',
  'bridge',
  'solo',
  'outro',
  'custom'
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  bpm numeric(6, 2) check (bpm is null or (bpm > 0 and bpm <= 10000)),
  time_signature text not null default '4/4'
    check (time_signature ~ '^[0-9]{1,2}/[0-9]{1,2}$'),
  musical_key text check (musical_key is null or char_length(musical_key) between 1 and 24),
  notes text,
  backing_track_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.song_sections (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  kind public.song_section_kind not null default 'verse',
  title text not null check (char_length(title) between 1 and 80),
  sort_order integer not null check (sort_order >= 0),
  start_bar integer not null default 1 check (start_bar >= 1),
  bars integer check (bars is null or bars >= 1),
  lyrics text,
  chords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.beat_sessions
  add column if not exists count_in_bars smallint not null default 0
    check (count_in_bars in (0, 1, 2, 4)),
  add column if not exists active_song_id uuid references public.songs (id) on delete set null,
  add column if not exists active_setlist_id uuid references public.setlists (id) on delete set null,
  add column if not exists active_section_id uuid references public.song_sections (id) on delete set null;

alter table public.member_devices
  add column if not exists battery_percent smallint
    check (battery_percent is null or (battery_percent >= 0 and battery_percent <= 100)),
  add column if not exists battery_charging boolean;

create index songs_team_id_idx on public.songs (team_id);
create index songs_created_by_idx on public.songs (created_by);
create index song_sections_song_id_idx on public.song_sections (song_id);
create index song_sections_team_id_idx on public.song_sections (team_id);
create index song_sections_song_sort_idx on public.song_sections (song_id, sort_order);
create index setlists_team_id_idx on public.setlists (team_id);
create index setlists_created_by_idx on public.setlists (created_by);
create index setlist_items_setlist_id_idx on public.setlist_items (setlist_id);
create index setlist_items_song_id_idx on public.setlist_items (song_id);
create index setlist_items_team_id_idx on public.setlist_items (team_id);
create index setlist_items_setlist_sort_idx on public.setlist_items (setlist_id, sort_order);
create index beat_sessions_active_song_id_idx on public.beat_sessions (active_song_id);
create index beat_sessions_active_setlist_id_idx on public.beat_sessions (active_setlist_id);
create index beat_sessions_active_section_id_idx on public.beat_sessions (active_section_id);

create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function iem_private.touch_updated_at();

create trigger song_sections_touch_updated_at
  before update on public.song_sections
  for each row execute function iem_private.touch_updated_at();

create trigger setlists_touch_updated_at
  before update on public.setlists
  for each row execute function iem_private.touch_updated_at();

create trigger setlist_items_touch_updated_at
  before update on public.setlist_items
  for each row execute function iem_private.touch_updated_at();

create or replace function iem_private.protect_session_controls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.team_id is distinct from old.team_id
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Session identity cannot be changed';
  end if;

  new.revision := old.revision;

  if new.bpm is distinct from old.bpm
    or new.status is distinct from old.status
    or new.genre_id is distinct from old.genre_id
    or new.time_signature is distinct from old.time_signature
    or new.beat_pattern is distinct from old.beat_pattern
    or new.start_at is distinct from old.start_at
    or new.pause_at is distinct from old.pause_at
    or new.sample_rate is distinct from old.sample_rate
    or new.position_beats is distinct from old.position_beats
    or new.count_in_bars is distinct from old.count_in_bars
    or new.active_song_id is distinct from old.active_song_id
    or new.active_setlist_id is distinct from old.active_setlist_id
    or new.active_section_id is distinct from old.active_section_id
  then
    new.revision := old.revision + 1;
  end if;

  return new;
end;
$$;
