-- Invite redemption: hashed tokens stay unreadable to invitees. A locked
-- SECURITY DEFINER function validates the raw token, creates a pending
-- membership, and increments use_count. Managers still use table RLS for
-- create/list/revoke. Identity columns on invites are immutable.

create or replace function iem_private.protect_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.token_hash is distinct from old.token_hash then
    raise exception 'Invite token hash is immutable';
  end if;
  if new.team_id is distinct from old.team_id then
    raise exception 'Invite team is immutable';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Invite creator is immutable';
  end if;
  if new.max_uses is distinct from old.max_uses then
    raise exception 'Invite usage limit is immutable';
  end if;
  if new.use_count < old.use_count then
    raise exception 'Invite use count cannot decrease';
  end if;
  return new;
end;
$$;

drop trigger if exists team_invites_protect on public.team_invites;
create trigger team_invites_protect
  before update on public.team_invites
  for each row execute function iem_private.protect_invite();

revoke all on function iem_private.protect_invite() from public, anon, authenticated;

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

  if found then
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

  insert into public.team_members (team_id, user_id, role, status)
  values (invite.team_id, actor, 'MEMBER', 'pending');

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

comment on function public.redeem_team_invite(text) is
  'Validates a raw invite token, creates a pending MEMBER row for auth.uid(), and consumes one use. Raw tokens are never stored.';

revoke all on function public.redeem_team_invite(text) from public, anon;
grant execute on function public.redeem_team_invite(text) to authenticated;
