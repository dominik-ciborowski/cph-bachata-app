create table if not exists public.user_event_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.user_event_favorites enable row level security;

create policy "Users can read their own favorites"
on public.user_event_favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
on public.user_event_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
on public.user_event_favorites
for delete
to authenticated
using (auth.uid() = user_id);
