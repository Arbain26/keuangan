-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create transactions table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text check (type in ('pemasukan', 'pengeluaran')) not null,
  category text not null,
  amount numeric not null,
  description text,
  date date not null
);

-- Ensure user_id column exists if table was created previously without it
alter table public.transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Create index for performance
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);

-- Enable Row Level Security
alter table public.transactions enable row level security;

-- Drop old permissive policies
drop policy if exists "Enable read access for all users" on public.transactions;
drop policy if exists "Enable insert for authenticated users only" on public.transactions;
drop policy if exists "Enable update for authenticated users only" on public.transactions;
drop policy if exists "Enable delete for authenticated users only" on public.transactions;
drop policy if exists "Users can read own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;

-- POLICY 1: User Read Access (Users can only read their own transactions, or Admin)
create policy "Users can read own transactions"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com');

-- POLICY 2: User Insert Access (Users can only insert transactions assigned to their own user_id)
create policy "Users can insert own transactions"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id);

-- POLICY 3: User Update Access (Users can only update their own transactions)
create policy "Users can update own transactions"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com')
with check (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com');

-- POLICY 4: User Delete Access (Users can only delete their own transactions)
create policy "Users can delete own transactions"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com');

-- ==============================================================================
-- TABLE: category_budgets (Monthly Spending Limits per Category)
-- ==============================================================================
create table if not exists public.category_budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category)
);

create index if not exists idx_category_budgets_user_id on public.category_budgets(user_id);

alter table public.category_budgets enable row level security;

drop policy if exists "Users can manage own budgets" on public.category_budgets;
create policy "Users can manage own budgets"
on public.category_budgets
for all
to authenticated
using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com')
with check (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'arbain@gmail.com');

