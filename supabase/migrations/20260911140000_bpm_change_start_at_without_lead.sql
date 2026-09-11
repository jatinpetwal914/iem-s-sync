-- Mid-play BPM changes must rewrite start_at from the current beat position
-- without adding Play/Resume lead. Lead exists so PLAY/RESUME can propagate
-- over Realtime. Applying it to a live tempo change jumps every client
-- backward by ~lead and makes devices "catch up" independently.

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

  if not iem_private.can_control_session(p_team_id) then
    raise exception 'Not allowed to control this session';
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

  if not found then
    raise exception 'Not allowed to control this session';
  end if;

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
