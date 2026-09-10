-- Existing members should see already-member even if the invite was later
-- revoked or expired.

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
