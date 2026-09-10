create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null default 'MEMBER',
  status public.membership_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id),
  check (role <> 'OWNER' or status = 'approved')
);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  token_hash text not null,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses >= 1),
  use_count integer not null default 0 check (use_count >= 0),
  status public.invite_status not null default 'active',
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token_hash),
  check (use_count <= max_uses),
  check (expires_at > created_at)
);

comment on column public.team_invites.token_hash is
  'SHA-256 hex digest of the invite token. Raw tokens are never stored.';

create table public.beat_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status public.session_status not null default 'stopped',
  bpm numeric(6, 2) not null default 120 check (bpm > 0 and bpm <= 400),
  genre_id text,
  time_signature text not null default '4/4' check (time_signature ~ '^[0-9]{1,2}/[0-9]{1,2}$'),
  beat_pattern text,
  revision bigint not null default 0 check (revision >= 0),
  start_at timestamptz,
  pause_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.beat_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sync_status public.sync_status not null default 'OFFLINE',
  clock_offset_ms numeric(10, 3),
  round_trip_ms numeric(10, 3),
  estimated_latency_ms numeric(10, 3),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.beat_sessions (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  event_type public.event_type not null,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null check (revision >= 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, revision)
);

create table public.member_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  device_label text,
  user_agent text,
  sync_status public.sync_status not null default 'OFFLINE',
  clock_offset_ms numeric(10, 3),
  round_trip_ms numeric(10, 3),
  estimated_latency_ms numeric(10, 3),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teams_owner_id_idx on public.teams (owner_id);
create index team_members_team_id_idx on public.team_members (team_id);
create index team_members_user_id_idx on public.team_members (user_id);
create index team_members_team_id_status_idx on public.team_members (team_id, status);
create index team_members_user_id_status_idx on public.team_members (user_id, status);
create index team_invites_team_id_idx on public.team_invites (team_id);
create index team_invites_team_id_status_idx on public.team_invites (team_id, status);
create index team_invites_created_by_idx on public.team_invites (created_by);
create index beat_sessions_team_id_idx on public.beat_sessions (team_id);
create index beat_sessions_team_id_status_idx on public.beat_sessions (team_id, status);
create index beat_sessions_created_by_idx on public.beat_sessions (created_by);
create index session_members_session_id_idx on public.session_members (session_id);
create index session_members_user_id_idx on public.session_members (user_id);
create index session_events_session_id_idx on public.session_events (session_id);
create index session_events_session_id_occurred_at_idx on public.session_events (session_id, occurred_at desc);
create index session_events_actor_id_idx on public.session_events (actor_id);
create index member_devices_user_id_idx on public.member_devices (user_id);
create index member_devices_team_id_idx on public.member_devices (team_id);
create index member_devices_user_id_sync_status_idx on public.member_devices (user_id, sync_status);
