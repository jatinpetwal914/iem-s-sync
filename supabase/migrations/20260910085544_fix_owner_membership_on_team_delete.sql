-- Owner membership must remain while the team exists, but CASCADE from
-- teams DELETE has to remove that row. Mark the parent delete in a
-- transaction-local setting so the membership trigger can allow it.

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

drop trigger if exists teams_mark_deleting on public.teams;

create trigger teams_mark_deleting
  before delete on public.teams
  for each row execute function iem_private.mark_team_deleting();

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
