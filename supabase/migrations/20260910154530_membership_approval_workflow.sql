-- Membership approval workflow: pending → approved/rejected, approved → removed.
-- Invitees who were rejected or removed can request again through a valid invite.
-- Managers see pending profiles; approved members only see approved roster rows.

alter table public.team_members
  add column if not exists requested_at timestamptz,
  add column if not exists requested_email text;

update public.team_members tm
set
  requested_at = coalesce(tm.requested_at, tm.created_at),
  requested_email = coalesce(tm.requested_email, u.email)
from auth.users u
where u.id = tm.user_id
  and (tm.requested_at is null or tm.requested_email is null);

update public.team_members
set requested_at = created_at
where requested_at is null;

alter table public.team_members
  alter column requested_at set default now(),
  alter column requested_at set not null;

create index if not exists team_members_team_id_pending_idx
  on public.team_members (team_id)
  where status = 'pending';

update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id
  and p.display_name is null
  and u.email is not null
  and position('@' in u.email) > 1;

create or replace function iem_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );
  return new;
end;
$$;

create or replace function iem_private.can_view_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    _user_id = (select auth.uid())
    or exists (
      select 1
      from public.team_members them
      where them.user_id = _user_id
        and iem_private.can_manage_members(them.team_id)
    )
    or iem_private.shares_approved_team_with(_user_id);
$$;

revoke all on function iem_private.can_view_profile(uuid) from public, anon;
grant execute on function iem_private.can_view_profile(uuid) to authenticated, service_role;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (iem_private.can_view_profile(id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or iem_private.can_manage_members(team_id)
    or (
      iem_private.is_approved_member(team_id)
      and status = 'approved'
    )
  );

drop policy if exists team_members_update_managers on public.team_members;
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
    and status in ('approved', 'rejected', 'removed')
  );

create or replace function iem_private.stamp_membership_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      new.requested_at := coalesce(new.requested_at, now());
      select u.email into new.requested_email
      from auth.users u
      where u.id = new.user_id;
    end if;
    return new;
  end if;

  if new.status = 'pending' and old.status is distinct from 'pending' then
    new.requested_at := now();
    select u.email into new.requested_email
    from auth.users u
    where u.id = new.user_id;
    new.role := 'MEMBER';
  end if;

  return new;
end;
$$;

drop trigger if exists team_members_stamp_request on public.team_members;
drop trigger if exists team_members_fill_request on public.team_members;
create trigger team_members_fill_request
  before insert or update on public.team_members
  for each row execute function iem_private.stamp_membership_request();

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
    if new.status = 'removed' then
      raise exception 'Membership cannot start as removed';
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
    if new.status is distinct from old.status then
      if not (
        (old.status = 'pending' and new.status in ('approved', 'rejected'))
        or (old.status = 'approved' and new.status = 'removed')
        or (old.status in ('rejected', 'removed') and new.status = 'pending')
      ) then
        raise exception 'Invalid membership status transition';
      end if;
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

create or replace function iem_private.revoke_member_runtime_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('rejected', 'removed') and old.status is distinct from new.status then
    delete from public.session_members sm
    using public.beat_sessions s
    where sm.session_id = s.id
      and s.team_id = new.team_id
      and sm.user_id = new.user_id;

    delete from public.member_devices
    where team_id = new.team_id
      and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists team_members_revoke_runtime on public.team_members;
create trigger team_members_revoke_runtime
  after update of status on public.team_members
  for each row execute function iem_private.revoke_member_runtime_access();

create or replace function public.redeem_team_invite(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  hashed text;
  invite public.team_invites%rowtype;
  existing public.team_members%rowtype;
  team_name text;
  has_row boolean := false;
begin
  if actor is null then
    return jsonb_build_object('outcome', 'unauthenticated');
  end if;

  if raw_token is null or raw_token !~ '^[A-Za-z0-9_-]{20,128}$' then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  hashed := iem_private.hash_invite_token(raw_token);

  select * into invite
  from public.team_invites
  where token_hash = hashed
  for update;

  if not found then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select t.name into team_name
  from public.teams t
  where t.id = invite.team_id;

  select * into existing
  from public.team_members
  where team_id = invite.team_id
    and user_id = actor;

  has_row := found;

  if has_row and existing.status in ('pending', 'approved') then
    return jsonb_build_object(
      'outcome', 'already_member',
      'team_id', invite.team_id,
      'team_name', team_name,
      'membership_status', existing.status,
      'role', existing.role
    );
  end if;

  if invite.status = 'revoked' or invite.revoked_at is not null then
    return jsonb_build_object(
      'outcome', 'revoked',
      'team_id', invite.team_id,
      'team_name', team_name
    );
  end if;

  if invite.expires_at <= now() then
    if invite.status = 'active' then
      update public.team_invites
      set status = 'expired'
      where id = invite.id
        and status = 'active';
    end if;

    return jsonb_build_object(
      'outcome', 'expired',
      'team_id', invite.team_id,
      'team_name', team_name
    );
  end if;

  if invite.status = 'exhausted' or invite.use_count >= invite.max_uses then
    if invite.status = 'active' then
      update public.team_invites
      set status = 'exhausted'
      where id = invite.id
        and status = 'active';
    end if;

    return jsonb_build_object(
      'outcome', 'invalid',
      'team_id', invite.team_id,
      'team_name', team_name
    );
  end if;

  if invite.status is distinct from 'active' then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  if has_row then
    update public.team_members
    set role = 'MEMBER', status = 'pending'
    where id = existing.id;
  else
    insert into public.team_members (team_id, user_id, role, status)
    values (invite.team_id, actor, 'MEMBER', 'pending');
  end if;

  update public.team_invites
  set
    use_count = use_count + 1,
    status = case
      when use_count + 1 >= max_uses then 'exhausted'::public.invite_status
      else status
    end
  where id = invite.id;

  return jsonb_build_object(
    'outcome', 'requested',
    'team_id', invite.team_id,
    'team_name', team_name,
    'membership_status', 'pending',
    'role', 'MEMBER'
  );
end;
$$;

revoke all on function public.redeem_team_invite(text) from public, anon;
grant execute on function public.redeem_team_invite(text) to authenticated;
