-- Varianto: per-user storage for repertoires and learn progress.
-- Every table is owned by auth.uid() and protected by Row Level Security.

create table public.repertoires (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null check (color in ('white', 'black')),
  root_id text not null,
  primary key (user_id, id)
);

create table public.nodes (
  user_id uuid not null default auth.uid(),
  repertoire_id text not null,
  id text not null,
  parent_id text,
  san text,
  fen text not null,
  comment text not null default '',
  child_ids text[] not null default '{}',
  primary key (user_id, repertoire_id, id),
  foreign key (user_id, repertoire_id)
    references public.repertoires (user_id, id) on delete cascade
);

create table public.learned (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id text not null,
  line_key text not null,
  primary key (user_id, course_id, line_key)
);

create table public.reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id text not null,
  line_key text not null,
  card jsonb not null,
  primary key (user_id, course_id, line_key)
);

create table public.drills (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint generated always as identity,
  course_id text not null,
  at bigint not null,
  result jsonb not null,
  primary key (user_id, id)
);

create index drills_course_idx on public.drills (user_id, course_id);

alter table public.repertoires enable row level security;
alter table public.nodes enable row level security;
alter table public.learned enable row level security;
alter table public.reviews enable row level security;
alter table public.drills enable row level security;

create policy "own rows" on public.repertoires for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.nodes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.learned for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.drills for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Replaces whole repertoires, nodes included, in one transaction.
-- reps: [{ id, name, color, rootId, nodes: [{ id, parentId, san, fen, comment, childIds }] }]
-- SECURITY INVOKER (the default): Row Level Security applies to every statement.
create function public.save_repertoires(reps jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  rep jsonb;
begin
  for rep in select * from jsonb_array_elements(reps) loop
    -- The upsert comes first: it takes the repertoire's row lock, so a concurrent call for the
    -- same repertoire waits here and then sees this call's committed nodes.
    insert into repertoires (id, name, color, root_id)
      values (rep->>'id', rep->>'name', rep->>'color', rep->>'rootId')
      on conflict (user_id, id) do update
        set name = excluded.name, color = excluded.color, root_id = excluded.root_id;
    delete from nodes where repertoire_id = rep->>'id' and user_id = auth.uid();
    insert into nodes (repertoire_id, id, parent_id, san, fen, comment, child_ids)
      select rep->>'id', n->>'id', n->>'parentId', n->>'san', n->>'fen',
             coalesce(n->>'comment', ''),
             coalesce(array(select jsonb_array_elements_text(n->'childIds')), '{}')
      from jsonb_array_elements(rep->'nodes') as n;
  end loop;
end $$;

revoke all on function public.save_repertoires(jsonb) from public, anon;
grant execute on function public.save_repertoires(jsonb) to authenticated;
