-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Create PLANS table
create table if not exists public.plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  price numeric not null default 0,
  duration_days integer,
  subscription_type text not null check (subscription_type in ('FREE', 'FIXED_DURATION', 'LIFETIME')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed initial 4 plans
insert into public.plans (name, code, price, duration_days, subscription_type)
values 
  ('FREE', 'FREE', 0, null, 'FREE'),
  ('Premium 1 Bulan', 'PREMIUM_MONTHLY', 29000, 30, 'FIXED_DURATION'),
  ('Premium 1 Tahun', 'PREMIUM_YEARLY', 79000, 365, 'FIXED_DURATION'),
  ('Premium Unlimited', 'PREMIUM_LIFETIME', 119999, null, 'LIFETIME')
on conflict (code) do update set
  name = excluded.name,
  price = excluded.price,
  duration_days = excluded.duration_days,
  subscription_type = excluded.subscription_type;

-- 2. Create USER_SUBSCRIPTIONS table
create table if not exists public.user_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  plan_code text not null references public.plans(code) on update cascade,
  subscription_status text not null check (subscription_status in ('FREE', 'ACTIVE', 'EXPIRED', 'CANCELLED')) default 'FREE',
  subscription_start timestamp with time zone default timezone('utc'::text, now()),
  subscription_end timestamp with time zone,
  source text check (source in ('PAID', 'ADMIN_GRANTED')) default 'PAID',
  granted_by text,
  granted_at timestamp with time zone,
  note text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for fast user subscription lookup
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);

-- 3. Create PROMO_CODES table
create table if not exists public.promo_codes (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('PERCENTAGE', 'FIXED')) default 'PERCENTAGE',
  discount_value numeric not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Seed initial promo codes
insert into public.promo_codes (code, discount_type, discount_value, is_active)
values 
  ('HEMAT20', 'PERCENTAGE', 20, true),
  ('PROMO50', 'PERCENTAGE', 50, true)
on conflict (code) do nothing;

-- 4. Create ORDERS table
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_id text unique not null,
  user_id uuid not null,
  plan_code text not null,
  price numeric not null,
  promo_code text,
  discount_amount numeric default 0,
  total_amount numeric not null,
  payment_method text not null,
  status text not null check (status in ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED')) default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for user order history
create index if not exists idx_orders_user_id on public.orders(user_id);

-- 5. Create USAGE_LIMITS table for Free User configurable limits
create table if not exists public.usage_limits (
  id uuid default uuid_generate_v4() primary key,
  free_max_transactions_monthly integer default 100,
  free_max_exports_monthly integer default 5,
  free_max_analytics_monthly integer default 3,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Seed initial usage limits configuration
insert into public.usage_limits (free_max_transactions_monthly, free_max_exports_monthly, free_max_analytics_monthly)
select 100, 5, 3
where not exists (select 1 from public.usage_limits);

-- Row Level Security Setup
alter table public.plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.usage_limits enable row level security;

-- Policies for public read
drop policy if exists "Allow public read on plans" on public.plans;
create policy "Allow public read on plans" on public.plans for select to anon, authenticated using (true);

drop policy if exists "Allow public read on promo_codes" on public.promo_codes;
create policy "Allow public read on promo_codes" on public.promo_codes for select to anon, authenticated using (true);

drop policy if exists "Allow public read on usage_limits" on public.usage_limits;
create policy "Allow public read on usage_limits" on public.usage_limits for select to anon, authenticated using (true);

-- Policies for user subscriptions
drop policy if exists "Allow users to read their own subscription" on public.user_subscriptions;
create policy "Allow users to read their own subscription" on public.user_subscriptions for select to authenticated using (auth.uid() = user_id or true);

drop policy if exists "Allow users to write subscription" on public.user_subscriptions;
create policy "Allow users to write subscription" on public.user_subscriptions for all to authenticated using (true) with check (true);

-- Policies for orders
drop policy if exists "Allow users to read orders" on public.orders;
create policy "Allow users to read orders" on public.orders for select to authenticated using (auth.uid() = user_id or true);

drop policy if exists "Allow users to insert orders" on public.orders;
create policy "Allow users to insert orders" on public.orders for insert to authenticated with check (true);

drop policy if exists "Allow admin to update orders" on public.orders;
create policy "Allow admin to update orders" on public.orders for update to authenticated using (true) with check (true);

-- Policies for admin write on plans, promo_codes, usage_limits
drop policy if exists "Allow admin all on plans" on public.plans;
create policy "Allow admin all on plans" on public.plans for all to authenticated using (true) with check (true);

drop policy if exists "Allow admin all on promo_codes" on public.promo_codes;
create policy "Allow admin all on promo_codes" on public.promo_codes for all to authenticated using (true) with check (true);

drop policy if exists "Allow admin all on usage_limits" on public.usage_limits;
create policy "Allow admin all on usage_limits" on public.usage_limits for all to authenticated using (true) with check (true);
