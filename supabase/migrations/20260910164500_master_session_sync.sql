-- Master session position, sample rate, one session per team, device telemetry,
-- server clock, and authoritative transport RPC. Clicks are never stored as rows.

alter table public.beat_sessions
  add column if not exists sample_rate integer not null default 44100
    check (sample_rate > 0 and sample_rate <= 384000),
  add column if not exists position_beats numeric(14, 6) not null default 0
    check (position_beats >= 0);

comment on column public.beat_sessions.position_beats is
  'Beats elapsed from bar 1 beat 1. Used to pause/resume and late-join without restarting.';

comment on column public.beat_sessions.sample_rate is
  'Nominal audio sample rate for derived samples-per-beat. Clicks are generated locally.';

alter table public.beat_sessions
  drop constraint if exists beat_sessions_bpm_check;

alter table public.beat_sessions
  alter column bpm type numeric(8, 2);

alter table public.beat_sessions
  add constraint beat_sessions_bpm_check
  check (bpm > 0 and bpm <= 10000);

create unique index if not exists beat_sessions_team_id_uidx
  on public.beat_sessions (team_id);

alter table public.member_devices
  add column if not exists session_id uuid references public.beat_sessions (id) on delete set null,
  add column if not exists platform text,
  add column if not exists browser text;

create index if not exists member_devices_session_id_idx
  on public.member_devices (session_id);

create index if not exists member_devices_team_last_seen_idx
  on public.member_devices (team_id, last_seen_at desc);

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
  then
    new.revision := old.revision + 1;
  end if;

  return new;
end;
$$;

create or replace function public.server_time()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

create or replace function iem_private.session_beats_elapsed(
  p_status public.session_status,
  p_start_at timestamptz,
  p_position_beats numeric,
  p_bpm numeric
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when p_status = 'paused' then greatest(p_position_beats, 0)
    when p_status = 'playing' and p_start_at is not null then
      case
        when now() < p_start_at then 0
        else (extract(epoch from (now() - p_start_at)) * 1000.0) * p_bpm / 60000.0
      end
    else 0
  end;
$$;

create or replace function public.ensure_beat_session(p_team_id uuid)
returns public.beat_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.beat_sessions;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_session
  from public.beat_sessions
  where team_id = p_team_id;

  if found then
    return v_session;
  end if;

  insert into public.beat_sessions (
    team_id,
    created_by,
    status,
    bpm,
    genre_id,
    time_signature,
    beat_pattern,
    sample_rate,
    position_beats
  )
  values (
    p_team_id,
    v_uid,
    'stopped',
    124,
    'pop-synthwave-house',
    '4/4',
    '1,0,0,0',
    44100,
    0
  )
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.control_beat_session(
  p_team_id uuid,
  p_command text,
  p_bpm numeric default null,
  p_genre_id text default null,
  p_time_signature text default null,
  p_beat_pattern text default null,
  p_sample_rate integer default null,
  p_lead_ms integer default 450
)
returns public.beat_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.beat_sessions;
  v_old public.beat_sessions;
  v_event public.event_type;
  v_lead_ms integer := greatest(100, least(coalesce(p_lead_ms, 450), 2000));
  v_position numeric;
  v_start timestamptz;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_command not in ('play', 'pause', 'resume', 'stop', 'reset', 'configure') then
    raise exception 'Unknown session command';
  end if;

  select * into v_session
  from public.beat_sessions
  where team_id = p_team_id
  for update;

  if not found then
    v_session := public.ensure_beat_session(p_team_id);
    select * into v_session
    from public.beat_sessions
    where id = v_session.id
    for update;
  end if;

  v_old := v_session;
  v_position := iem_private.session_beats_elapsed(
    v_session.status,
    v_session.start_at,
    v_session.position_beats,
    v_session.bpm
  );

  if p_bpm is not null then
    if p_bpm <= 0 or p_bpm > 10000 then
      raise exception 'BPM must be between 1 and 10000';
    end if;
    v_session.bpm := p_bpm;
  end if;

  if p_genre_id is not null then
    v_session.genre_id := p_genre_id;
  end if;

  if p_time_signature is not null then
    if p_time_signature !~ '^[0-9]{1,2}/[0-9]{1,2}$' then
      raise exception 'Time signature is invalid';
    end if;
    v_session.time_signature := p_time_signature;
  end if;

  if p_beat_pattern is not null then
    v_session.beat_pattern := p_beat_pattern;
  end if;

  if p_sample_rate is not null then
    if p_sample_rate <= 0 or p_sample_rate > 384000 then
      raise exception 'Sample rate is invalid';
    end if;
    v_session.sample_rate := p_sample_rate;
  end if;

  if p_command = 'play' then
    if v_old.status = 'playing' then
      raise exception 'Session is already playing';
    end if;
    if v_old.status = 'paused' then
      raise exception 'Resume a paused session instead of play';
    end if;
    v_session.status := 'playing';
    v_session.position_beats := 0;
    v_session.start_at := now() + make_interval(secs => v_lead_ms / 1000.0);
    v_session.pause_at := null;
    v_event := 'play';
  elsif p_command = 'pause' then
    if v_old.status is distinct from 'playing' then
      raise exception 'Pause is only valid while playing';
    end if;
    v_session.status := 'paused';
    v_session.position_beats := v_position;
    v_session.pause_at := now();
    v_event := 'pause';
  elsif p_command = 'resume' then
    if v_old.status is distinct from 'paused' then
      raise exception 'Resume is only valid while paused';
    end if;
    v_session.status := 'playing';
    v_start := now()
      + make_interval(secs => v_lead_ms / 1000.0)
      - make_interval(secs => (v_session.position_beats * 60.0) / v_session.bpm);
    v_session.start_at := v_start;
    v_session.pause_at := null;
    v_event := 'resume';
  elsif p_command = 'stop' then
    if v_old.status not in ('playing', 'paused') then
      raise exception 'Stop is only valid while playing or paused';
    end if;
    v_session.status := 'stopped';
    v_session.position_beats := 0;
    v_session.start_at := null;
    v_session.pause_at := now();
    v_event := 'stop';
  elsif p_command = 'reset' then
    v_session.position_beats := 0;
    v_session.pause_at := null;
    if v_old.status = 'playing' then
      v_session.status := 'playing';
      v_session.start_at := now() + make_interval(secs => v_lead_ms / 1000.0);
    else
      v_session.status := 'stopped';
      v_session.start_at := null;
    end if;
    v_event := 'reset';
  else
    if v_old.status = 'playing' and v_session.bpm is distinct from v_old.bpm then
      v_start := now()
        + make_interval(secs => v_lead_ms / 1000.0)
        - make_interval(secs => (v_position * 60.0) / v_session.bpm);
      v_session.start_at := v_start;
      v_session.position_beats := v_position;
    end if;

    if v_session.bpm is distinct from v_old.bpm then
      v_event := 'bpm_change';
    elsif v_session.beat_pattern is distinct from v_old.beat_pattern then
      v_event := 'pattern_change';
    elsif v_session.time_signature is distinct from v_old.time_signature then
      v_event := 'signature_change';
    elsif v_session.genre_id is distinct from v_old.genre_id then
      v_event := 'genre_change';
    else
      v_event := null;
    end if;
  end if;

  update public.beat_sessions
  set
    status = v_session.status,
    bpm = v_session.bpm,
    genre_id = v_session.genre_id,
    time_signature = v_session.time_signature,
    beat_pattern = v_session.beat_pattern,
    sample_rate = v_session.sample_rate,
    start_at = v_session.start_at,
    pause_at = v_session.pause_at,
    position_beats = v_session.position_beats
  where id = v_session.id
  returning * into v_session;

  if v_event is not null and v_session.revision is distinct from v_old.revision then
    v_payload := jsonb_build_object(
      'command', p_command,
      'bpm', v_session.bpm,
      'genre_id', v_session.genre_id,
      'time_signature', v_session.time_signature,
      'beat_pattern', v_session.beat_pattern,
      'sample_rate', v_session.sample_rate,
      'start_at', v_session.start_at,
      'pause_at', v_session.pause_at,
      'position_beats', v_session.position_beats,
      'status', v_session.status
    );

    insert into public.session_events (
      session_id,
      actor_id,
      event_type,
      payload,
      revision
    )
    values (
      v_session.id,
      v_uid,
      v_event,
      v_payload,
      v_session.revision
    );
  end if;

  return v_session;
end;
$$;

revoke all on function public.server_time() from public, anon;
revoke all on function public.ensure_beat_session(uuid) from public, anon;
revoke all on function public.control_beat_session(uuid, text, numeric, text, text, text, integer, integer) from public, anon;

grant execute on function public.server_time() to authenticated;
grant execute on function public.ensure_beat_session(uuid) to authenticated;
grant execute on function public.control_beat_session(uuid, text, numeric, text, text, text, integer, integer) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table only public.team_members;
  end if;
end;
$$;
