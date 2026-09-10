grant execute on function iem_private.session_beats_elapsed(
  public.session_status,
  timestamptz,
  numeric,
  numeric
) to authenticated, service_role;
