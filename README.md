# cph-bachata-app

Simple Vue + Supabase MVP for collecting and displaying Copenhagen bachata events.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase project URL and anon key.

## Supabase SQL

Run this in Supabase SQL editor:

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text,
  facebook_url text not null,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  category text default 'social',
  price_text text,
  description text,
  approved boolean default true,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "Public can read approved events"
on public.events for select
using (approved = true);

create policy "Authenticated users can manage events"
on public.events for all
to authenticated
using (true)
with check (true);
```

## Hosting

Recommended: Netlify. Build command: `npm run build`. Publish directory: `dist`.
