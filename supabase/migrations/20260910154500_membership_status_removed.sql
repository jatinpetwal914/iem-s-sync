-- New membership status must be committed before later migrations use it.
alter type public.membership_status add value if not exists 'removed';
