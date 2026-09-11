-- Optional personal IEM monitor mix.
-- Does not change control_beat_session, click scheduling, or startAt sync.
-- Live microphone audio is never stored here. This table holds routing
-- configuration only. Actual audio uses WebRTC when monitor_audio_enabled.

alter table public.beat_sessions
  add column if not exists monitor_audio_enabled boolean not null default false;

comment on column public.beat_sessions.monitor_audio_enabled is
  'Optional member-to-member monitor routing. Default off. Does not bump session revision so PLAY/BPM stay undisturbed.';

create table public.monitor_mixes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  sources jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, receiver_id),
  constraint monitor_mixes_sources_object check (jsonb_typeof(sources) = 'object')
);

create index monitor_mixes_team_id_idx
  on public.monitor_mixes (team_id);

create index monitor_mixes_receiver_idx
  on public.monitor_mixes (team_id, receiver_id);

comment on table public.monitor_mixes is
  'Per-receiver monitor routing. Keys in sources are self, sync, or a teammate user id. No live audio.';

create trigger monitor_mixes_touch_updated_at
  before update on public.monitor_mixes
  for each row execute function iem_private.touch_updated_at();

create or replace function iem_private.sanitize_monitor_sources(
  p_team_id uuid,
  p_sources jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_out jsonb := '{}'::jsonb;
  v_gain numeric;
  v_muted boolean;
  v_solo boolean;
  v_uuid uuid;
  v_count integer := 0;
begin
  if p_sources is null or jsonb_typeof(p_sources) <> 'object' then
    raise exception 'Monitor mix sources must be an object';
  end if;

  for v_key, v_value in
    select key, value from jsonb_each(p_sources)
  loop
    v_count := v_count + 1;
    if v_count > 32 then
      raise exception 'Monitor mix has too many sources';
    end if;

    if v_key not in ('self', 'sync') then
      begin
        v_uuid := v_key::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Invalid monitor source';
      end;

      if not exists (
        select 1
        from public.team_members tm
        where tm.team_id = p_team_id
          and tm.user_id = v_uuid
          and tm.status = 'approved'
      ) then
        raise exception 'Monitor source is not an approved team member';
      end if;
    end if;

    if jsonb_typeof(v_value) <> 'object' then
      raise exception 'Monitor source must be an object';
    end if;

    begin
      v_gain := least(100, greatest(0, coalesce((v_value->>'gain')::numeric, 0)));
    exception
      when others then
        v_gain := 0;
    end;

    begin
      v_muted := coalesce((v_value->>'muted')::boolean, false);
    exception
      when others then
        v_muted := false;
    end;

    begin
      v_solo := coalesce((v_value->>'solo')::boolean, false);
    exception
      when others then
        v_solo := false;
    end;

    v_out := v_out || jsonb_build_object(
      v_key,
      jsonb_build_object(
        'gain', v_gain,
        'muted', v_muted,
        'solo', v_solo
      )
    );
  end loop;

  return v_out;
end;
$$;

create or replace function iem_private.protect_monitor_mix()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.team_id is distinct from old.team_id
      or new.receiver_id is distinct from old.receiver_id
    then
      raise exception 'Monitor mix identity cannot be changed';
    end if;
    new.revision := old.revision;
  end if;

  new.sources := iem_private.sanitize_monitor_sources(new.team_id, new.sources);

  if not exists (
    select 1
    from public.team_members tm
    where tm.team_id = new.team_id
      and tm.user_id = new.receiver_id
      and tm.status = 'approved'
  ) then
    raise exception 'Monitor mix receiver is not an approved team member';
  end if;

  if tg_op = 'UPDATE'
    and (
      new.sources is distinct from old.sources
      or new.locked is distinct from old.locked
    )
  then
    new.revision := old.revision + 1;
  end if;

  return new;
end;
$$;

create trigger monitor_mixes_protect
  before insert or update on public.monitor_mixes
  for each row execute function iem_private.protect_monitor_mix();

alter table public.monitor_mixes enable row level security;
alter table public.monitor_mixes force row level security;

create policy monitor_mixes_select on public.monitor_mixes
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy monitor_mixes_insert on public.monitor_mixes
  for insert to authenticated
  with check (iem_private.can_control_session(team_id));

create policy monitor_mixes_update on public.monitor_mixes
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (iem_private.can_control_session(team_id));

create policy monitor_mixes_delete on public.monitor_mixes
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

grant select, insert, update, delete on public.monitor_mixes to authenticated;

alter table public.monitor_mixes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'monitor_mixes'
  ) then
    alter publication supabase_realtime add table only public.monitor_mixes;
  end if;
end;
$$;

create or replace function public.configure_monitor_audio(
  p_team_id uuid,
  p_enabled boolean
)
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

  if not iem_private.can_control_session(p_team_id) then
    raise exception 'Not allowed to control this session';
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

  update public.beat_sessions
  set monitor_audio_enabled = coalesce(p_enabled, false)
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.save_monitor_mix(
  p_team_id uuid,
  p_receiver_id uuid,
  p_sources jsonb,
  p_locked boolean default false
)
returns public.monitor_mixes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.monitor_mixes;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not iem_private.can_control_session(p_team_id) then
    raise exception 'Not allowed to configure monitor mixes';
  end if;

  insert into public.monitor_mixes (
    team_id,
    receiver_id,
    sources,
    locked
  )
  values (
    p_team_id,
    p_receiver_id,
    coalesce(p_sources, '{}'::jsonb),
    coalesce(p_locked, false)
  )
  on conflict (team_id, receiver_id)
  do update set
    sources = excluded.sources,
    locked = excluded.locked
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.configure_monitor_audio(uuid, boolean) to authenticated;
grant execute on function public.save_monitor_mix(uuid, uuid, jsonb, boolean) to authenticated;
grant execute on function iem_private.sanitize_monitor_sources(uuid, jsonb) to authenticated, service_role;
grant execute on function iem_private.protect_monitor_mix() to authenticated, service_role;
