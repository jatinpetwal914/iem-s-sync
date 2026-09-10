-- One master session per team. Concurrent ensure_beat_session calls must not
-- create two clocks for the same roster.

alter table public.beat_sessions
  add constraint beat_sessions_team_id_key unique (team_id);

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

  if not iem_private.can_control_session(p_team_id) then
    raise exception 'Not allowed to create a master session';
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
  on conflict (team_id) do nothing
  returning * into v_session;

  if not found then
    select * into v_session
    from public.beat_sessions
    where team_id = p_team_id;
  end if;

  return v_session;
end;
$$;
