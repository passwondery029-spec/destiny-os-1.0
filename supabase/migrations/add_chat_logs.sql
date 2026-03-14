-- Create chat_logs table
create table public.chat_logs (
  id uuid default gen_random_uuid() primary key,
  profile_id text not null,
  role text not null check (role in ('user', 'model')),
  text text not null,
  timestamp bigint not null
);

-- Enable RLS
alter table public.chat_logs enable row level security;

-- Create simple policy permitting everything (since this is a simple local app)
create policy "Enable all access for chat_logs" on public.chat_logs as permissive for all using (true);
