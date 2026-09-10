create or replace function iem_private.is_team_owner(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = _team_id
      and t.owner_id = (select auth.uid())
  );
$$;

create or replace function iem_private.team_owner_id(_team_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.owner_id
  from public.teams t
  where t.id = _team_id
$$;

create or replace function iem_private.is_approved_member(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = _team_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'approved'
  );
$$;

create or replace function iem_private.has_membership_row(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = _team_id
      and tm.user_id = (select auth.uid())
  );
$$;

create or replace function iem_private.is_approved_admin(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = _team_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'approved'
      and tm.role = 'ADMIN'
  );
$$;

create or replace function iem_private.can_manage_members(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    iem_private.is_team_owner(_team_id)
    or iem_private.is_approved_admin(_team_id);
$$;

create or replace function iem_private.can_control_session(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    iem_private.is_team_owner(_team_id)
    or iem_private.is_approved_admin(_team_id);
$$;

create or replace function iem_private.session_team_id(_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.team_id
  from public.beat_sessions s
  where s.id = _session_id
$$;

create or replace function iem_private.shares_approved_team_with(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members me
    join public.team_members them
      on them.team_id = me.team_id
    where me.user_id = (select auth.uid())
      and me.status = 'approved'
      and them.user_id = _user_id
      and them.status = 'approved'
  );
$$;

create or replace function iem_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create or replace function iem_private.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (team_id, user_id, role, status)
  values (new.id, new.owner_id, 'OWNER', 'approved');
  return new;
end;
$$;

create or replace function iem_private.protect_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function iem_private.protect_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  owner uuid;
begin
  select t.owner_id into owner
  from public.teams t
  where t.id = coalesce(new.team_id, old.team_id);

  if tg_op = 'INSERT' then
    if new.role = 'OWNER' and new.user_id is distinct from owner then
      raise exception 'Only the team owner can hold the OWNER role';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id then
      raise exception 'Membership identity is immutable';
    end if;
    if old.role = 'OWNER' and (new.role is distinct from old.role or new.status is distinct from old.status) then
      raise exception 'Owner membership cannot be changed';
    end if;
    if new.role = 'OWNER' and old.role is distinct from 'OWNER' then
      raise exception 'Users cannot make themselves or others OWNER';
    end if;
    if actor is not null and new.user_id = actor then
      if new.role is distinct from old.role then
        raise exception 'Users cannot modify their own role';
      end if;
      if new.status is distinct from old.status then
        raise exception 'Users cannot approve or change their own membership status';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if current_setting('iem_private.deleting_team_id', true) is not distinct from old.team_id::text then
      return old;
    end if;
    if old.role = 'OWNER' or old.user_id = owner then
      raise exception 'Owner membership cannot be removed';
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function iem_private.protect_session_controls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.bpm is distinct from old.bpm
    or new.status is distinct from old.status
    or new.genre_id is distinct from old.genre_id
    or new.time_signature is distinct from old.time_signature
    or new.beat_pattern is distinct from old.beat_pattern
    or new.start_at is distinct from old.start_at
    or new.pause_at is distinct from old.pause_at
  then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function iem_private.touch_updated_at();

create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function iem_private.touch_updated_at();

create trigger team_members_touch_updated_at
  before update on public.team_members
  for each row execute function iem_private.touch_updated_at();

create trigger team_invites_touch_updated_at
  before update on public.team_invites
  for each row execute function iem_private.touch_updated_at();

create trigger beat_sessions_touch_updated_at
  before update on public.beat_sessions
  for each row execute function iem_private.touch_updated_at();

create trigger session_members_touch_updated_at
  before update on public.session_members
  for each row execute function iem_private.touch_updated_at();

create trigger session_events_touch_updated_at
  before update on public.session_events
  for each row execute function iem_private.touch_updated_at();

create trigger member_devices_touch_updated_at
  before update on public.member_devices
  for each row execute function iem_private.touch_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function iem_private.handle_new_user();

create trigger teams_assign_owner_membership
  after insert on public.teams
  for each row execute function iem_private.handle_new_team();

create trigger teams_protect_owner
  before update on public.teams
  for each row execute function iem_private.protect_team();

create or replace function iem_private.mark_team_deleting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('iem_private.deleting_team_id', old.id::text, true);
  return old;
end;
$$;

create trigger teams_mark_deleting
  before delete on public.teams
  for each row execute function iem_private.mark_team_deleting();

create trigger team_members_protect
  before insert or update or delete on public.team_members
  for each row execute function iem_private.protect_membership();

create trigger beat_sessions_revision
  before update on public.beat_sessions
  for each row execute function iem_private.protect_session_controls();
