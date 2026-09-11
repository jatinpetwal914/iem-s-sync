-- Additive: voice takes + optional lyric timing / effect settings.
-- Does not change beat_sessions transport, control_beat_session, or click scheduling.

create type public.lyrics_effect as enum (
  'static',
  'line',
  'karaoke',
  'progressive'
);

create type public.lyrics_transition as enum ('instant', 'smooth');

create type public.lyrics_speed as enum ('slow', 'normal', 'fast');

create type public.recording_status as enum ('processing', 'ready', 'failed');

alter table public.songs
  add column if not exists lyrics_effect public.lyrics_effect not null default 'static',
  add column if not exists lyrics_transition public.lyrics_transition not null default 'smooth',
  add column if not exists lyrics_auto_advance boolean not null default true,
  add column if not exists lyrics_highlight boolean not null default true,
  add column if not exists lyrics_upcoming_lines smallint not null default 2
    check (lyrics_upcoming_lines between 1 and 3),
  add column if not exists lyrics_speed public.lyrics_speed not null default 'normal';

-- lyric_cues: JSON array of { text, startMs, endMs, words?: [{ text, startMs, endMs }] }
-- Times are milliseconds from the start of this section, after count-in.
alter table public.song_sections
  add column if not exists lyric_cues jsonb not null default '[]'::jsonb;

create table public.song_recordings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  session_id uuid references public.beat_sessions (id) on delete set null,
  title text not null default 'Take' check (char_length(title) between 1 and 80),
  take_number integer not null check (take_number >= 1),
  storage_path text not null unique,
  mime_type text not null,
  duration_ms integer not null check (duration_ms >= 0),
  file_size integer not null check (file_size >= 0),
  status public.recording_status not null default 'ready',
  performer_name text,
  performer_role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (song_id, user_id, take_number),
  check (
    storage_path like (
      team_id::text || '/' || song_id::text || '/' || user_id::text || '/%'
    )
  )
);

create index song_recordings_team_song_created_idx
  on public.song_recordings (team_id, song_id, created_at desc);

create index song_recordings_user_id_idx
  on public.song_recordings (user_id);

create index song_recordings_song_id_idx
  on public.song_recordings (song_id);

create index song_recordings_session_id_idx
  on public.song_recordings (session_id);

create trigger song_recordings_touch_updated_at
  before update on public.song_recordings
  for each row execute function iem_private.touch_updated_at();

create or replace function iem_private.assign_recording_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  select tm.role
    into v_role
  from public.team_members tm
  where tm.team_id = new.team_id
    and tm.user_id = new.user_id
    and tm.status = 'approved';

  select p.display_name
    into v_name
  from public.profiles p
  where p.id = new.user_id;

  new.performer_role := v_role;
  new.performer_name := v_name;

  select coalesce(max(r.take_number), 0) + 1
    into new.take_number
  from public.song_recordings r
  where r.song_id = new.song_id
    and r.user_id = new.user_id;

  if new.title is null
    or btrim(new.title) = ''
    or lower(btrim(new.title)) = 'take'
  then
    new.title := 'Take ' || new.take_number::text;
  end if;

  return new;
end;
$$;

create trigger song_recordings_assign_identity
  before insert on public.song_recordings
  for each row execute function iem_private.assign_recording_identity();

create or replace function iem_private.protect_recording_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.team_id is distinct from old.team_id
    or new.song_id is distinct from old.song_id
    or new.user_id is distinct from old.user_id
    or new.storage_path is distinct from old.storage_path
    or new.take_number is distinct from old.take_number
    or new.session_id is distinct from old.session_id
    or new.mime_type is distinct from old.mime_type
    or new.duration_ms is distinct from old.duration_ms
    or new.file_size is distinct from old.file_size
  then
    raise exception 'Recording identity and file metadata cannot be changed';
  end if;

  return new;
end;
$$;

create trigger song_recordings_protect_identity
  before update on public.song_recordings
  for each row execute function iem_private.protect_recording_identity();
