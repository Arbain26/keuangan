-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text check (type in ('pemasukan', 'pengeluaran')) not null,
  category text not null,
  amount numeric not null,
  description text,
  date date not null
);

-- Enable Row Level Security
alter table public.transactions enable row level security;

-- POLICY 1: Public Read Access
-- Allows anyone (anon and authenticated) to read data
create policy "Enable read access for all users"
on public.transactions
for select
to anon, authenticated
using (true);

-- POLICY 2: Admin Write Access
-- Allows only authenticated users to INSERT
create policy "Enable insert for authenticated users only"
on public.transactions
for insert
to authenticated
with check (true);

-- POLICY 3: Admin Update Access
-- Allows only authenticated users to UPDATE
create policy "Enable update for authenticated users only"
on public.transactions
for update
to authenticated
using (true)
with check (true);

-- POLICY 4: Admin Delete Access
-- Allows only authenticated users to DELETE
create policy "Enable delete for authenticated users only"
on public.transactions
for delete
to authenticated
using (true);
