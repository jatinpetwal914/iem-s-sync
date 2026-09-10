-- Truncate ignores RLS. Authenticated clients may only use DML that policies
-- govern. session_events is append-only. Profiles are not client-deleted.

revoke all on all tables in schema public from anon, public, authenticated;

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
