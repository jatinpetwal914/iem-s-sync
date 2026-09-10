-- SQL assertions for IEM Sync RLS. Impersonates authenticated users via JWT
-- claims. Safe to re-run; fixtures use @example.invalid and are deleted after.

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_invitee uuid := gen_random_uuid();
  v_team uuid;
  v_other_team uuid;
  v_session uuid;
  v_member_row uuid;
  v_device uuid;
  v_invite uuid;
  v_expired_invite uuid;
  v_revoked_invite uuid;
  v_json jsonb;
  n int;
  hashed text;
  started_at timestamptz := clock_timestamp();
  failed text[] := '{}';
begin
  delete from auth.users where email like 'iem-rls-%@example.invalid';

  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values
    (
      v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'iem-rls-owner@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      v_member, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'iem-rls-member@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      v_outsider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'iem-rls-outsider@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    ),
    (
      v_invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'iem-rls-invitee@example.invalid', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );

  hashed := iem_private.hash_invite_token('raw-invite-token-never-stored');
  if hashed !~ '^[a-f0-9]{64}$' then
    failed := array_append(failed, 'invite hash is sha256 hex');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.teams (name, owner_id)
  values ('RLS Team', v_owner)
  returning id into v_team;

  insert into public.teams (name, owner_id)
  values ('Other Team', v_owner)
  returning id into v_other_team;

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and user_id = v_owner
    and role = 'OWNER'
    and status = 'approved';
  if n <> 1 then
    failed := array_append(failed, 'owner membership auto-created');
  end if;

  insert into public.beat_sessions (team_id, created_by, bpm, status)
  values (v_team, v_owner, 120, 'stopped')
  returning id into v_session;

  insert into public.team_invites (team_id, created_by, token_hash, expires_at)
  values (v_team, v_owner, hashed, now() + interval '7 days');

  insert into public.team_invites (
    team_id, created_by, token_hash, expires_at, max_uses
  )
  values (
    v_team, v_owner, iem_private.hash_invite_token('phase5inviteToken_ok123456'),
    now() + interval '7 days', 2
  )
  returning id into v_invite;

  insert into public.team_invites (
    team_id, created_by, token_hash, expires_at, created_at
  )
  values (
    v_team, v_owner, iem_private.hash_invite_token('phase5inviteToken_expired99'),
    now() - interval '1 day', now() - interval '2 days'
  )
  returning id into v_expired_invite;

  insert into public.team_invites (
    team_id, created_by, token_hash, expires_at
  )
  values (
    v_team, v_owner, iem_private.hash_invite_token('phase5inviteToken_revoked88'),
    now() + interval '7 days'
  )
  returning id into v_revoked_invite;

  update public.team_invites
  set status = 'revoked', revoked_at = now()
  where id = v_revoked_invite;

  select count(*) into n
  from public.team_invites
  where team_id = v_team and token_hash = hashed;
  if n <> 1 then
    failed := array_append(failed, 'owner can store hashed invite');
  end if;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  select count(*) into n from public.teams;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot read another team');
  end if;

  update public.teams set name = 'Stolen' where id = v_team;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot edit team name');
  end if;

  begin
    insert into public.team_members (team_id, user_id, role, status)
    values (v_team, v_outsider, 'OWNER', 'approved');
    failed := array_append(failed, 'outsider cannot insert owner membership');
  exception when others then
    null;
  end;
  select count(*) into n from public.beat_sessions;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot read sessions');
  end if;
  select count(*) into n from public.team_invites;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot read invites');
  end if;

  begin
    insert into public.beat_sessions (team_id, created_by) values (v_team, v_outsider);
    failed := array_append(failed, 'outsider cannot create session');
  exception when others then
    null;
  end;

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  insert into public.team_members (team_id, user_id, role, status)
  values (v_team, v_member, 'MEMBER', 'pending')
  returning id into v_member_row;

  select count(*) into n from public.teams where id = v_team;
  if n <> 1 then
    failed := array_append(failed, 'pending member can see requested team');
  end if;

  select count(*) into n from public.team_members where team_id = v_team;
  if n <> 1 then
    failed := array_append(failed, 'pending member cannot see other memberships');
  end if;

  update public.teams set name = 'Pending Hijack' where id = v_team;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'pending member cannot edit team name');
  end if;

  select count(*) into n from public.beat_sessions where id = v_session;
  if n <> 0 then
    failed := array_append(failed, 'pending member cannot read session');
  end if;

  update public.team_members
  set status = 'approved'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot approve self');
  end if;

  update public.team_members
  set role = 'ADMIN'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot change own role');
  end if;

  update public.team_members
  set role = 'OWNER'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot make self owner');
  end if;

  update public.beat_sessions set bpm = 90 where id = v_session;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'pending member cannot change bpm');
  end if;

  select count(*) into n from public.team_invites;
  if n <> 0 then
    failed := array_append(failed, 'pending member cannot read invites');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'approved'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can approve member');
  end if;

  select count(*) into n from public.team_members where team_id = v_team;
  if n <> 2 then
    failed := array_append(failed, 'owner can see team members');
  end if;

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and user_id = v_member
    and role = 'MEMBER'
    and status = 'approved';
  if n <> 1 then
    failed := array_append(failed, 'owner can see member role and status');
  end if;

  update public.teams set name = 'Renamed RLS Team' where id = v_team;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can edit team name');
  end if;

  update public.beat_sessions
  set bpm = 128, status = 'playing', start_at = started_at
  where id = v_session;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can control master session');
  end if;

  insert into public.session_events (session_id, actor_id, event_type, payload, revision)
  values (v_session, v_owner, 'play', '{"bpm":128}'::jsonb, 1);

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  select count(*) into n from public.beat_sessions where id = v_session and bpm = 128;
  if n <> 1 then
    failed := array_append(failed, 'approved member can read active session');
  end if;

  select count(*) into n from public.team_members where team_id = v_team;
  if n <> 2 then
    failed := array_append(failed, 'approved member can see roster');
  end if;

  update public.teams set name = 'Member Hijack' where id = v_team;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot edit team name');
  end if;

  select count(*) into n from public.session_events where session_id = v_session;
  if n <> 1 then
    failed := array_append(failed, 'approved member can read session events');
  end if;

  update public.beat_sessions set bpm = 90 where id = v_session;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot modify master bpm');
  end if;

  update public.beat_sessions set status = 'stopped' where id = v_session;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot stop master session');
  end if;

  begin
    insert into public.session_events (session_id, actor_id, event_type, payload, revision)
    values (v_session, v_member, 'stop', '{}'::jsonb, 2);
    failed := array_append(failed, 'member cannot insert master events');
  exception when others then
    null;
  end;

  insert into public.member_devices (user_id, team_id, sync_status)
  values (v_member, v_team, 'GOOD')
  returning id into v_device;
  if v_device is null then
    failed := array_append(failed, 'member can insert own device');
  end if;

  update public.member_devices
  set sync_status = 'EXCELLENT'
  where id = v_device;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'member can update own device');
  end if;

  begin
    insert into public.member_devices (user_id, team_id)
    values (v_owner, v_team);
    failed := array_append(failed, 'member cannot insert another user device');
  exception when others then
    null;
  end;

  select count(*) into n from public.team_invites;
  if n <> 0 then
    failed := array_append(failed, 'approved member cannot read invite hashes');
  end if;

  update public.team_invites
  set status = 'revoked', revoked_at = now()
  where id = v_invite;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'member cannot revoke invitations');
  end if;

  select count(*) into n from public.teams where id = v_other_team;
  if n <> 0 then
    failed := array_append(failed, 'member cannot read a team they did not join');
  end if;

  select count(*) into n from public.team_members where team_id = v_other_team;
  if n <> 0 then
    failed := array_append(failed, 'member cannot see another team roster');
  end if;

  insert into public.session_members (session_id, user_id, sync_status)
  values (v_session, v_member, 'GOOD');
  update public.session_members
  set round_trip_ms = 12.5
  where session_id = v_session and user_id = v_member;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'member can update own session presence');
  end if;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  select count(*) into n from public.member_devices;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot read member devices');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  update public.team_members
  set role = 'MEMBER'
  where team_id = v_team and user_id = v_owner;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'owner cannot change own role via update');
  end if;

  update public.team_members
  set role = 'ADMIN'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can promote member to admin');
  end if;

  begin
    update public.team_members
    set role = 'OWNER'
    where id = v_member_row;
    get diagnostics n = row_count;
    if n <> 0 then
      failed := array_append(failed, 'owner cannot assign OWNER role via update');
    end if;
  exception when others then
    null;
  end;

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);

  update public.teams set name = 'Admin Hijack' where id = v_team;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'admin cannot edit team name');
  end if;

  update public.team_members
  set role = 'OWNER'
  where id = v_member_row;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'admin cannot make self owner');
  end if;

  update public.team_members
  set role = 'MEMBER'
  where team_id = v_team and user_id = v_owner;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'admin cannot demote owner');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);

  v_json := public.redeem_team_invite('phase5inviteToken_expired99');
  if v_json->>'outcome' is distinct from 'expired' then
    failed := array_append(failed, 'expired invite is expired');
  end if;

  v_json := public.redeem_team_invite('phase5inviteToken_revoked88');
  if v_json->>'outcome' is distinct from 'revoked' then
    failed := array_append(failed, 'revoked invite is revoked');
  end if;

  v_json := public.redeem_team_invite('phase5inviteToken_missing00');
  if v_json->>'outcome' is distinct from 'invalid' then
    failed := array_append(failed, 'unknown token is invalid');
  end if;

  v_json := public.redeem_team_invite('phase5inviteToken_ok123456');
  if v_json->>'outcome' is distinct from 'requested' then
    failed := array_append(failed, 'valid invite creates membership request');
  end if;

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and user_id = v_invitee
    and role = 'MEMBER'
    and status = 'pending';
  if n <> 1 then
    failed := array_append(failed, 'invitee becomes pending member');
  end if;

  v_json := public.redeem_team_invite('phase5inviteToken_ok123456');
  if v_json->>'outcome' is distinct from 'already_member' then
    failed := array_append(failed, 'repeat redeem is already-member');
  end if;

  select count(*) into n from public.beat_sessions where id = v_session;
  if n <> 0 then
    failed := array_append(failed, 'pending invitee cannot read session');
  end if;

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and status = 'approved';
  if n <> 0 then
    failed := array_append(failed, 'pending member cannot see approved roster rows');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and user_id = v_invitee
    and status = 'pending'
    and requested_email = 'iem-rls-invitee@example.invalid';
  if n <> 1 then
    failed := array_append(failed, 'owner can see join request email');
  end if;

  select count(*) into n from public.profiles where id = v_invitee;
  if n <> 1 then
    failed := array_append(failed, 'owner can see pending member profile');
  end if;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'approved'
  where team_id = v_team
    and user_id = v_invitee;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'outsider cannot approve join request');
  end if;

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'approved'
  where team_id = v_team
    and user_id = v_invitee;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'invitee cannot approve self');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'rejected'
  where team_id = v_team
    and user_id = v_invitee
    and status = 'pending';
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can reject join request');
  end if;

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  select count(*) into n from public.beat_sessions where id = v_session;
  if n <> 0 then
    failed := array_append(failed, 'rejected member cannot read session');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  insert into public.team_invites (
    team_id, created_by, token_hash, expires_at, max_uses
  )
  values (
    v_team,
    v_owner,
    iem_private.hash_invite_token('phase6inviteToken_rerequest01'),
    now() + interval '7 days',
    1
  );

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  v_json := public.redeem_team_invite('phase6inviteToken_rerequest01');
  if v_json->>'outcome' is distinct from 'requested' then
    failed := array_append(failed, 'rejected member can request again with a valid invite');
  end if;

  select count(*) into n
  from public.team_members
  where team_id = v_team
    and user_id = v_invitee
    and role = 'MEMBER'
    and status = 'pending';
  if n <> 1 then
    failed := array_append(failed, 're-request returns membership to pending');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'approved'
  where team_id = v_team
    and user_id = v_invitee
    and status = 'pending';
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can approve join request');
  end if;

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  select count(*) into n from public.beat_sessions where id = v_session;
  if n <> 1 then
    failed := array_append(failed, 'approved invitee can read session');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  update public.team_members
  set status = 'removed'
  where team_id = v_team
    and user_id = v_invitee
    and status = 'approved';
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can remove approved member');
  end if;

  perform set_config('request.jwt.claim.sub', v_invitee::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_invitee, 'role', 'authenticated')::text, true);
  select count(*) into n from public.beat_sessions where id = v_session;
  if n <> 0 then
    failed := array_append(failed, 'removed member immediately loses session access');
  end if;

  update public.team_members
  set status = 'approved'
  where team_id = v_team
    and user_id = v_invitee;
  get diagnostics n = row_count;
  if n <> 0 then
    failed := array_append(failed, 'removed member cannot restore own access');
  end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  update public.team_invites
  set status = 'revoked', revoked_at = now()
  where id = v_invite
    and status = 'active';
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can revoke invitation');
  end if;

  delete from public.teams where id = v_other_team;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can delete own team');
  end if;

  delete from public.teams where id = v_team;
  get diagnostics n = row_count;
  if n <> 1 then
    failed := array_append(failed, 'owner can delete team with members');
  end if;

  reset role;
  delete from auth.users where id in (v_owner, v_member, v_outsider, v_invitee);

  if array_length(failed, 1) is not null then
    raise exception 'RLS assertions failed: %', array_to_string(failed, '; ');
  end if;
exception
  when others then
    reset role;
    delete from public.teams
    where owner_id in (
      select id from auth.users where email like 'iem-rls-%@example.invalid'
    );
    delete from auth.users where email like 'iem-rls-%@example.invalid';
    raise;
end $$;

select 'rls_assertions_passed' as result;
