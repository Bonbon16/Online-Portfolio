create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant insert (name, email, message) on public.messages to anon, authenticated;
drop policy if exists "Allow public message inserts" on public.messages;
create policy "Allow public message inserts" on public.messages for insert to anon, authenticated with check (true);
-- Files are served from /public, so no Storage bucket is needed.
