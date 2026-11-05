-- Days on which the learner practised, for the daily streak.
-- `day` is the learner's local calendar date; it is never derived from server time.
create table public.activity_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.activity_days enable row level security;

create policy "own rows" on public.activity_days for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
