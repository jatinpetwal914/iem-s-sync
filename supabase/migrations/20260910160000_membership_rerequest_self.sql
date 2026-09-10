-- Invite redemption is SECURITY DEFINER but auth.uid() is still the invitee.
-- Re-requesting after rejected/removed must be allowed for that user; clients
-- still cannot set status to pending through table RLS.

create or replace function iem_private.protect_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  owner uuid;
  rerequest boolean := false;
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

    rerequest :=
      old.status in ('rejected', 'removed')
      and new.status = 'pending';

    if actor is not null and new.user_id = actor and not rerequest then
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

revoke all on function iem_private.stamp_membership_request() from public, anon;
revoke all on function iem_private.revoke_member_runtime_access() from public, anon;
revoke all on function iem_private.can_view_profile(uuid) from public, anon;
grant execute on function iem_private.stamp_membership_request() to authenticated, service_role;
grant execute on function iem_private.revoke_member_runtime_access() to authenticated, service_role;
grant execute on function iem_private.can_view_profile(uuid) to authenticated, service_role;
