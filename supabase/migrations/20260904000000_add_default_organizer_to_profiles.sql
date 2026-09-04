alter table public.profiles
  add column if not exists default_organizer text;
