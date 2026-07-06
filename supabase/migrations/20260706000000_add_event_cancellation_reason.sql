alter table public.events
add column if not exists cancellation_reason text;
