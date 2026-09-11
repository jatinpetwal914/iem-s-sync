-- RLS, realtime, and Admin performance RPC for the song/setlist library.

alter table public.songs enable row level security;
alter table public.song_sections enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.songs force row level security;
alter table public.song_sections force row level security;
alter table public.setlists force row level security;
alter table public.setlist_items force row level security;

create policy songs_select on public.songs
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy songs_insert on public.songs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and iem_private.can_control_session(team_id)
  );

create policy songs_update on public.songs
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (iem_private.can_control_session(team_id));

create policy songs_delete on public.songs
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

create policy song_sections_select on public.song_sections
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy song_sections_insert on public.song_sections
  for insert to authenticated
  with check (
    iem_private.can_control_session(team_id)
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.team_id = team_id
    )
  );

create policy song_sections_update on public.song_sections
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (
    iem_private.can_control_session(team_id)
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.team_id = team_id
    )
  );

create policy song_sections_delete on public.song_sections
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

create policy setlists_select on public.setlists
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy setlists_insert on public.setlists
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and iem_private.can_control_session(team_id)
  );

create policy setlists_update on public.setlists
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (iem_private.can_control_session(team_id));

create policy setlists_delete on public.setlists
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

create policy setlist_items_select on public.setlist_items
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy setlist_items_insert on public.setlist_items
  for insert to authenticated
  with check (
    iem_private.can_control_session(team_id)
    and exists (
      select 1 from public.setlists sl
      where sl.id = setlist_id
        and sl.team_id = team_id
    )
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.team_id = team_id
    )
  );

create policy setlist_items_update on public.setlist_items
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (
    iem_private.can_control_session(team_id)
    and exists (
      select 1 from public.setlists sl
      where sl.id = setlist_id
        and sl.team_id = team_id
    )
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.team_id = team_id
    )
  );

create policy setlist_items_delete on public.setlist_items
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

revoke all on table public.songs, public.song_sections, public.setlists, public.setlist_items
  from anon, public, authenticated;

grant select, insert, update, delete on
  public.songs,
  public.song_sections,
  public.setlists,
  public.setlist_items
to authenticated;

alter table public.songs replica identity full;
alter table public.song_sections replica identity full;
alter table public.setlists replica identity full;
alter table public.setlist_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'songs'
  ) then
    alter publication supabase_realtime add table only public.songs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'song_sections'
  ) then
    alter publication supabase_realtime add table only public.song_sections;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'setlists'
  ) then
    alter publication supabase_realtime add table only public.setlists;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'setlist_items'
  ) then
    alter publication supabase_realtime add table only public.setlist_items;
  end if;
end;
$$;

create or replace function public.configure_performance(
  p_team_id uuid,
  p_count_in_bars integer default null,
  p_song_id uuid default null,
  p_setlist_id uuid default null
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
  v_song public.songs;
  v_event public.event_type;
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

  v_old := v_session;

  if p_count_in_bars is not null then
    if p_count_in_bars not in (0, 1, 2, 4) then
      raise exception 'Count-in must be 0, 1, 2, or 4 bars';
    end if;
    v_session.count_in_bars := p_count_in_bars;
  end if;

  if p_setlist_id is not null then
    if not exists (
      select 1 from public.setlists
      where id = p_setlist_id and team_id = p_team_id
    ) then
      raise exception 'Setlist is not on this team';
    end if;
    v_session.active_setlist_id := p_setlist_id;
  end if;

  if p_song_id is not null then
    select * into v_song
    from public.songs
    where id = p_song_id and team_id = p_team_id;

    if not found then
      raise exception 'Song is not on this team';
    end if;

    v_session.active_song_id := v_song.id;
    v_session.active_section_id := null;
    if v_song.bpm is not null then
      v_session.bpm := v_song.bpm;
    end if;
    v_session.time_signature := v_song.time_signature;
  end if;

  update public.beat_sessions
  set
    count_in_bars = v_session.count_in_bars,
    active_song_id = v_session.active_song_id,
    active_setlist_id = v_session.active_setlist_id,
    active_section_id = v_session.active_section_id,
    bpm = v_session.bpm,
    time_signature = v_session.time_signature
  where id = v_session.id
  returning * into v_session;

  if v_session.active_song_id is distinct from v_old.active_song_id then
    v_event := 'song_change';
  elsif v_session.count_in_bars is distinct from v_old.count_in_bars then
    v_event := 'count_in_change';
  else
    v_event := 'genre_change';
  end if;

  if v_session.revision is distinct from v_old.revision then
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
      jsonb_build_object(
        'count_in_bars', v_session.count_in_bars,
        'active_song_id', v_session.active_song_id,
        'active_setlist_id', v_session.active_setlist_id,
        'bpm', v_session.bpm,
        'time_signature', v_session.time_signature
      ),
      v_session.revision
    );
  end if;

  return v_session;
end;
$$;

revoke all on function public.configure_performance(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.configure_performance(uuid, integer, uuid, uuid) to authenticated;
