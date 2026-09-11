-- Restore the storage_path prefix check so files must live under
-- {team_id}/{song_id}/{user_id}/...  (the first apply omitted the % wildcard).

do $$
declare
  v_name text;
begin
  select c.conname
    into v_name
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'song_recordings'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%storage_path like%';

  if v_name is not null then
    execute format('alter table public.song_recordings drop constraint %I', v_name);
  end if;
end;
$$;

alter table public.song_recordings
  add constraint song_recordings_storage_path_like_check
  check (
    storage_path like (
      team_id::text || '/' || song_id::text || '/' || user_id::text || '/%'
    )
  );
