alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.beat_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.session_events enable row level security;
alter table public.member_devices enable row level security;

alter table public.profiles force row level security;
alter table public.teams force row level security;
alter table public.team_members force row level security;
alter table public.team_invites force row level security;
alter table public.beat_sessions force row level security;
alter table public.session_members force row level security;
alter table public.session_events force row level security;
alter table public.member_devices force row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists teams_select on public.teams;
drop policy if exists teams_insert on public.teams;
drop policy if exists teams_update on public.teams;
drop policy if exists teams_delete on public.teams;
drop policy if exists team_members_select on public.team_members;
drop policy if exists team_members_insert on public.team_members;
drop policy if exists team_members_insert_self on public.team_members;
drop policy if exists team_members_insert_managers on public.team_members;
drop policy if exists team_members_update_managers on public.team_members;
drop policy if exists team_members_delete_managers on public.team_members;
drop policy if exists team_invites_select on public.team_invites;
drop policy if exists team_invites_insert on public.team_invites;
drop policy if exists team_invites_update on public.team_invites;
drop policy if exists team_invites_delete on public.team_invites;
drop policy if exists beat_sessions_select on public.beat_sessions;
drop policy if exists beat_sessions_insert on public.beat_sessions;
drop policy if exists beat_sessions_update on public.beat_sessions;
drop policy if exists beat_sessions_delete on public.beat_sessions;
drop policy if exists session_members_select on public.session_members;
drop policy if exists session_members_insert on public.session_members;
drop policy if exists session_members_update on public.session_members;
drop policy if exists session_members_delete on public.session_members;
drop policy if exists session_events_select on public.session_events;
drop policy if exists session_events_insert on public.session_events;
drop policy if exists member_devices_select on public.member_devices;
drop policy if exists member_devices_insert on public.member_devices;
drop policy if exists member_devices_update on public.member_devices;
drop policy if exists member_devices_delete on public.member_devices;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or iem_private.shares_approved_team_with(id)
  );

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy teams_select on public.teams
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or iem_private.has_membership_row(id)
  );

create policy teams_insert on public.teams
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy teams_update on public.teams
  for update to authenticated
  using (iem_private.is_team_owner(id))
  with check (
    iem_private.is_team_owner(id)
    and owner_id = (select auth.uid())
  );

create policy teams_delete on public.teams
  for delete to authenticated
  using (iem_private.is_team_owner(id));

create policy team_members_select on public.team_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or iem_private.is_approved_member(team_id)
    or iem_private.is_team_owner(team_id)
  );

create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role = 'MEMBER'
      and status = 'pending'
    )
    or (
      iem_private.can_manage_members(team_id)
      and role in ('ADMIN', 'MEMBER')
    )
  );

create policy team_members_update_managers on public.team_members
  for update to authenticated
  using (
    iem_private.can_manage_members(team_id)
    and user_id is distinct from (select auth.uid())
    and user_id is distinct from iem_private.team_owner_id(team_id)
  )
  with check (
    iem_private.can_manage_members(team_id)
    and user_id is distinct from (select auth.uid())
    and user_id is distinct from iem_private.team_owner_id(team_id)
    and role in ('ADMIN', 'MEMBER')
  );

create policy team_members_delete_managers on public.team_members
  for delete to authenticated
  using (
    iem_private.can_manage_members(team_id)
    and user_id is distinct from (select auth.uid())
    and role <> 'OWNER'
    and user_id is distinct from iem_private.team_owner_id(team_id)
  );

create policy team_invites_select on public.team_invites
  for select to authenticated
  using (iem_private.can_manage_members(team_id));

create policy team_invites_insert on public.team_invites
  for insert to authenticated
  with check (
    iem_private.can_manage_members(team_id)
    and created_by = (select auth.uid())
    and token_hash ~ '^[a-f0-9]{64}$'
  );

create policy team_invites_update on public.team_invites
  for update to authenticated
  using (iem_private.can_manage_members(team_id))
  with check (
    iem_private.can_manage_members(team_id)
    and token_hash ~ '^[a-f0-9]{64}$'
  );

create policy team_invites_delete on public.team_invites
  for delete to authenticated
  using (iem_private.can_manage_members(team_id));

create policy beat_sessions_select on public.beat_sessions
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy beat_sessions_insert on public.beat_sessions
  for insert to authenticated
  with check (
    iem_private.can_control_session(team_id)
    and created_by = (select auth.uid())
  );

create policy beat_sessions_update on public.beat_sessions
  for update to authenticated
  using (iem_private.can_control_session(team_id))
  with check (iem_private.can_control_session(team_id));

create policy beat_sessions_delete on public.beat_sessions
  for delete to authenticated
  using (iem_private.can_control_session(team_id));

create policy session_members_select on public.session_members
  for select to authenticated
  using (
    iem_private.is_approved_member(iem_private.session_team_id(session_id))
  );

create policy session_members_insert on public.session_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and iem_private.is_approved_member(iem_private.session_team_id(session_id))
  );

create policy session_members_update on public.session_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and iem_private.is_approved_member(iem_private.session_team_id(session_id))
  );

create policy session_members_delete on public.session_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or iem_private.can_manage_members(iem_private.session_team_id(session_id))
  );

create policy session_events_select on public.session_events
  for select to authenticated
  using (
    iem_private.is_approved_member(iem_private.session_team_id(session_id))
  );

create policy session_events_insert on public.session_events
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and iem_private.can_control_session(iem_private.session_team_id(session_id))
  );

create policy member_devices_select on public.member_devices
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      team_id is not null
      and iem_private.is_approved_member(team_id)
    )
  );

create policy member_devices_insert on public.member_devices
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      team_id is null
      or iem_private.is_approved_member(team_id)
    )
  );

create policy member_devices_update on public.member_devices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      team_id is null
      or iem_private.is_approved_member(team_id)
    )
  );

create policy member_devices_delete on public.member_devices
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on all tables in schema public from anon, public, authenticated;
revoke all on all functions in schema iem_private from public, anon;

grant select, insert, update, delete on
  public.teams,
  public.team_members,
  public.team_invites,
  public.beat_sessions,
  public.session_members,
  public.member_devices
to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert on public.session_events to authenticated;

grant execute on all functions in schema iem_private to authenticated, service_role;

alter table public.teams replica identity full;
alter table public.team_members replica identity full;
alter table public.team_invites replica identity full;
alter table public.beat_sessions replica identity full;
alter table public.session_members replica identity full;
alter table public.session_events replica identity full;
alter table public.member_devices replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table only public.teams;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table only public.team_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'beat_sessions'
  ) then
    alter publication supabase_realtime add table only public.beat_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'session_members'
  ) then
    alter publication supabase_realtime add table only public.session_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'session_events'
  ) then
    alter publication supabase_realtime add table only public.session_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'member_devices'
  ) then
    alter publication supabase_realtime add table only public.member_devices;
  end if;
end $$;
