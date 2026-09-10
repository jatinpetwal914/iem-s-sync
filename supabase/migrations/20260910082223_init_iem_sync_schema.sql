-- IEM Sync schema, authorization helpers, indexes, and RLS.
-- Invite tokens are stored only as SHA-256 hashes. Helper functions live in
-- iem_private so they can be SECURITY DEFINER without recursive RLS.

create schema if not exists iem_private;

revoke all on schema iem_private from public;
grant usage on schema iem_private to authenticated, service_role;

create type public.user_role as enum ('OWNER', 'ADMIN', 'MEMBER');
create type public.membership_status as enum ('pending', 'approved', 'rejected');
create type public.session_status as enum ('stopped', 'playing', 'paused');
create type public.event_type as enum (
  'play',
  'pause',
  'resume',
  'stop',
  'reset',
  'bpm_change',
  'pattern_change',
  'signature_change',
  'genre_change'
);
create type public.sync_status as enum ('EXCELLENT', 'GOOD', 'UNSTABLE', 'OFFLINE');
create type public.invite_status as enum ('active', 'expired', 'revoked', 'exhausted');

create or replace function iem_private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function iem_private.hash_invite_token(raw_token text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function iem_private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;
