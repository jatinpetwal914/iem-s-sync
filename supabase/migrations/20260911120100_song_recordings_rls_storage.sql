-- RLS, grants, realtime, and private storage for voice takes.

alter table public.song_recordings enable row level security;
alter table public.song_recordings force row level security;

create policy song_recordings_select on public.song_recordings
  for select to authenticated
  using (iem_private.is_approved_member(team_id));

create policy song_recordings_insert on public.song_recordings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and iem_private.is_approved_member(team_id)
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.team_id = team_id
    )
    and (
      session_id is null
      or exists (
        select 1 from public.beat_sessions bs
        where bs.id = session_id
          and bs.team_id = team_id
      )
    )
  );

create policy song_recordings_update on public.song_recordings
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or iem_private.can_control_session(team_id)
  )
  with check (
    user_id = (select auth.uid())
    or iem_private.can_control_session(team_id)
  );

create policy song_recordings_delete on public.song_recordings
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or iem_private.can_control_session(team_id)
  );

revoke all on table public.song_recordings from anon, public, authenticated;
grant select, insert, update, delete on public.song_recordings to authenticated;

alter table public.song_recordings replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'song_recordings'
  ) then
    alter publication supabase_realtime add table only public.song_recordings;
  end if;
end;
$$;

create or replace function iem_private.storage_path_uuid(object_name text, part integer)
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_raw text;
begin
  v_raw := split_part(object_name, '/', part);
  if v_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_raw::uuid;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-takes',
  'voice-takes',
  false,
  52428800,
  array[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/aac',
    'audio/x-m4a',
    'video/webm',
    'video/mp4'
  ]
)
on conflict (id) do nothing;

create policy voice_takes_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-takes'
    and iem_private.is_approved_member(iem_private.storage_path_uuid(name, 1))
  );

create policy voice_takes_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice-takes'
    and iem_private.storage_path_uuid(name, 1) is not null
    and iem_private.storage_path_uuid(name, 2) is not null
    and iem_private.storage_path_uuid(name, 3) = (select auth.uid())
    and iem_private.is_approved_member(iem_private.storage_path_uuid(name, 1))
    and exists (
      select 1 from public.songs s
      where s.id = iem_private.storage_path_uuid(name, 2)
        and s.team_id = iem_private.storage_path_uuid(name, 1)
    )
  );

create policy voice_takes_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'voice-takes'
    and iem_private.storage_path_uuid(name, 3) = (select auth.uid())
  )
  with check (
    bucket_id = 'voice-takes'
    and iem_private.storage_path_uuid(name, 3) = (select auth.uid())
  );

create policy voice_takes_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'voice-takes'
    and (
      iem_private.storage_path_uuid(name, 3) = (select auth.uid())
      or iem_private.can_control_session(iem_private.storage_path_uuid(name, 1))
    )
  );
