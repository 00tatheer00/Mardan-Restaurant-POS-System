-- ONE-TIME SETUP: paste into Supabase → SQL Editor → Run. Generated from supabase/migrations + seed.sql.

-- Kabab House: schema, RLS, views, storage
create extension if not exists pgcrypto;

create type user_role as enum ('owner', 'manager', 'cashier');
create type order_type as enum ('dine_in', 'takeaway', 'delivery');
create type order_status as enum ('open', 'paid', 'void');
create type payment_method as enum ('cash', 'card', 'jazzcash', 'easypaisa');
create type raw_unit as enum ('kg', 'litre', 'piece');

create function pk_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Karachi')::date $$;

create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────── Tables ─────────────
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
insert into branches (id, name, address) values ('00000000-0000-0000-0000-000000000001', 'Kabab House Mardan', 'Main Bazar, Mardan');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  username text unique check (username = lower(username)),
  role user_role not null default 'cashier',
  pin_hash text,
  is_active boolean not null default true
);

create table settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null default 'Kabab House',
  address text,
  phone text,
  ntn text,
  strn text,
  pos_id text not null default 'POS-01',
  invoice_prefix text not null default 'KH-',
  tax_enabled boolean not null default true,
  tax_rate numeric(5,2) not null default 15,
  tax_inclusive boolean not null default false,
  receipt_footer text default 'Thank you! Please visit again.',
  logo_url text,
  expected_yield_per_kg numeric(10,3) not null default 20,
  discount_limit numeric(12,2) not null default 100
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'pcs'
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  unit text not null default 'plate',
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  product_id uuid references products,
  product_qty_per_unit numeric(10,3) not null default 0
);

create table orders (
  id uuid primary key,
  invoice_no text not null unique,
  order_type order_type not null default 'takeaway',
  table_no text,
  status order_status not null default 'open',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method payment_method,
  amount_received numeric(12,2),
  change_due numeric(12,2),
  void_reason text,
  cashier_id uuid references profiles,
  device_id text,
  created_at_local timestamptz not null default now(),
  synced_at timestamptz default now(),
  check (status <> 'void' or void_reason is not null)
);

create table order_items (
  id uuid primary key,
  order_id uuid not null references orders on delete cascade,
  menu_item_id uuid references menu_items,
  name_snapshot text not null,
  unit_price numeric(12,2) not null,
  qty numeric(10,3) not null check (qty > 0),
  line_total numeric(12,2) not null
);

create table raw_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit raw_unit not null default 'kg',
  is_active boolean not null default true
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  is_active boolean not null default true
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  date date not null default pk_today(),
  raw_item_id uuid not null references raw_items,
  supplier_id uuid references suppliers,
  qty numeric(10,3) not null check (qty > 0),
  rate numeric(12,2) not null check (rate >= 0),
  total numeric(12,2) not null,
  is_paid boolean not null default true,
  note text
);

create table supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers,
  date date not null default pk_today(),
  amount numeric(12,2) not null check (amount > 0),
  note text
);

create table production_batches (
  id uuid primary key default gen_random_uuid(),
  date date not null default pk_today(),
  raw_item_id uuid not null references raw_items,
  raw_qty numeric(10,3) not null check (raw_qty > 0),
  product_id uuid not null references products,
  qty_produced numeric(10,3) not null check (qty_produced >= 0),
  note text
);

create table day_closings (
  id uuid primary key default gen_random_uuid(),
  date date not null default pk_today(),
  product_id uuid not null references products,
  opening_qty numeric(10,3) not null default 0,
  produced_qty numeric(10,3) not null default 0,
  sold_qty numeric(10,3) not null default 0,
  leftover_qty numeric(10,3) not null default 0,
  wastage_qty numeric(10,3) not null default 0,
  difference numeric(10,3) not null default 0,
  closed_by uuid references profiles,
  unique (date, product_id)
);

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default pk_today(),
  category_id uuid not null references expense_categories,
  amount numeric(12,2) not null check (amount > 0),
  payment_method payment_method not null default 'cash',
  note text,
  receipt_url text
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  cnic text,
  designation text,
  monthly_salary numeric(12,2) not null default 0,
  joining_date date,
  is_active boolean not null default true
);

create table salary_advances (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff,
  date date not null default pk_today(),
  amount numeric(12,2) not null check (amount > 0),
  note text
);

create table salary_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff,
  month date not null check (extract(day from month) = 1),
  base_salary numeric(12,2) not null,
  advances_deducted numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  paid_on date default pk_today(),
  note text
);

-- Common columns, updated_at trigger, RLS on every branch-scoped table
do $$
declare t text;
begin
  foreach t in array array['profiles','settings','categories','products','menu_items','orders','order_items','raw_items',
    'suppliers','purchases','supplier_payments','production_batches','day_closings','expense_categories','expenses',
    'staff','salary_advances','salary_payments'] loop
    execute format('alter table %I
      add column branch_id uuid not null default %L references branches,
      add column created_at timestamptz not null default now(),
      add column updated_at timestamptz,
      add column created_by uuid default auth.uid() references profiles', t, '00000000-0000-0000-0000-000000000001');
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated_at', t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
create trigger branches_updated_at before update on branches for each row execute function set_updated_at();
alter table branches enable row level security;
alter table settings add constraint settings_branch_unique unique (branch_id);

create index on orders (created_at_local);
create index on orders (status);
create index on orders (cashier_id);
create index on order_items (order_id);
create index on menu_items (category_id);
create index on purchases (date);
create index on purchases (supplier_id);
create index on production_batches (date);
create index on expenses (date);
create index on salary_advances (staff_id, date);
create index on salary_payments (staff_id, month);

-- ───────────── Auth helpers ─────────────
-- Named auth_role (current_role is a reserved SQL keyword)
create function auth_role() returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create function has_role(variadic roles user_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = any(roles), false)
$$;

-- New auth user → profile. First user becomes owner; otherwise role comes from admin-set app_metadata.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(nullif(new.raw_user_meta_data->>'username', '')),
    case when not exists (select 1 from profiles where role = 'owner') then 'owner'::user_role
         else coalesce((new.raw_app_meta_data->>'role')::user_role, 'cashier') end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- pin_hash is never readable/writable by clients (service role only)
revoke all on profiles from anon, authenticated;
grant select (id, full_name, username, role, is_active, branch_id, created_at, updated_at, created_by) on profiles to authenticated;
grant update (full_name, username, role, is_active) on profiles to authenticated;

-- ───────────── RLS policies ─────────────
create policy profiles_select on profiles for select to authenticated using ((select auth_role()) is not null);
create policy profiles_update on profiles for update to authenticated using ((select has_role('owner'))) with check ((select has_role('owner')));

create policy branches_select on branches for select to authenticated using ((select auth_role()) is not null);
create policy branches_write on branches for update to authenticated using ((select has_role('owner'))) with check ((select has_role('owner')));

do $$
declare t text;
begin
  -- master data: everyone reads, owner writes
  foreach t in array array['settings','categories','products','menu_items'] loop
    execute format('create policy %I on %I for select to authenticated using ((select auth_role()) is not null)', t || '_select', t);
    execute format('create policy %I on %I for insert to authenticated with check ((select has_role(''owner'')))', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using ((select has_role(''owner''))) with check ((select has_role(''owner'')))', t || '_update', t);
  end loop;
  -- operations: owner + manager
  foreach t in array array['raw_items','suppliers','purchases','supplier_payments','production_batches','day_closings','expense_categories','expenses'] loop
    execute format('create policy %I on %I for select to authenticated using ((select has_role(''owner'',''manager'')))', t || '_select', t);
    execute format('create policy %I on %I for insert to authenticated with check ((select has_role(''owner'',''manager'')))', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using ((select has_role(''owner'',''manager''))) with check ((select has_role(''owner'',''manager'')))', t || '_update', t);
  end loop;
  -- HR / salary: owner only
  foreach t in array array['staff','salary_advances','salary_payments'] loop
    execute format('create policy %I on %I for all to authenticated using ((select has_role(''owner''))) with check ((select has_role(''owner'')))', t || '_owner', t);
  end loop;
end $$;

-- Orders: cashier sees/edits own; only owner can void; nobody deletes
create policy orders_select on orders for select to authenticated
  using ((select has_role('owner','manager')) or cashier_id = (select auth.uid()));
create policy orders_insert on orders for insert to authenticated
  with check ((select auth_role()) is not null
    and (cashier_id = (select auth.uid()) or (select has_role('owner','manager')))
    and (status <> 'void' or (select has_role('owner'))));
create policy orders_update on orders for update to authenticated
  using ((select has_role('owner')) or (status <> 'void' and ((select has_role('manager')) or cashier_id = (select auth.uid()))))
  with check (status <> 'void' or (select has_role('owner')));

create policy order_items_select on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id));
create policy order_items_insert on order_items for insert to authenticated
  with check (exists (select 1 from orders o where o.id = order_id and o.status <> 'void'));
create policy order_items_update on order_items for update to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.status <> 'void'))
  with check (exists (select 1 from orders o where o.id = order_id and o.status <> 'void'));
create policy order_items_delete on order_items for delete to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.status = 'open'));

-- ───────────── Report views (RLS applies via security_invoker) ─────────────
create view v_daily_sales with (security_invoker = true) as
select (o.created_at_local at time zone 'Asia/Karachi')::date as date,
  count(*)::int as orders_count,
  sum(o.subtotal) as subtotal,
  sum(o.discount) as discount,
  sum(o.tax_amount) as tax_amount,
  sum(o.total) as total,
  round(avg(o.total), 2) as avg_bill,
  coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0) as cash,
  coalesce(sum(o.total) filter (where o.payment_method = 'card'), 0) as card,
  coalesce(sum(o.total) filter (where o.payment_method = 'jazzcash'), 0) as jazzcash,
  coalesce(sum(o.total) filter (where o.payment_method = 'easypaisa'), 0) as easypaisa
from orders o where o.status = 'paid'
group by 1;

create view v_hourly_sales with (security_invoker = true) as
select (o.created_at_local at time zone 'Asia/Karachi')::date as date,
  extract(hour from o.created_at_local at time zone 'Asia/Karachi')::int as hour,
  count(*)::int as orders_count,
  sum(o.total) as total
from orders o where o.status = 'paid'
group by 1, 2;

create view v_item_sales with (security_invoker = true) as
select (o.created_at_local at time zone 'Asia/Karachi')::date as date,
  oi.menu_item_id,
  coalesce(mi.name, oi.name_snapshot) as name,
  c.id as category_id,
  c.name as category_name,
  sum(oi.qty) as qty,
  sum(oi.line_total) as amount
from order_items oi
join orders o on o.id = oi.order_id and o.status = 'paid'
left join menu_items mi on mi.id = oi.menu_item_id
left join categories c on c.id = mi.category_id
group by 1, 2, 3, 4, 5;

-- Salaries = advances (on their date) + salary payments (on paid_on)
create view v_daily_pnl with (security_invoker = true) as
with s as (select date, total as sales from v_daily_sales),
p as (select date, sum(total) as purchases from purchases group by 1),
e as (select date, sum(amount) as expenses from expenses group by 1),
sal as (
  select date, sum(amount) as salaries from (
    select date, amount from salary_advances
    union all
    select paid_on, amount_paid from salary_payments where paid_on is not null
  ) x group by 1
),
d as (select date from s union select date from p union select date from e union select date from sal)
select d.date,
  coalesce(s.sales, 0) as sales,
  coalesce(p.purchases, 0) as purchases,
  coalesce(e.expenses, 0) as expenses,
  coalesce(sal.salaries, 0) as salaries,
  coalesce(s.sales, 0) - coalesce(p.purchases, 0) - coalesce(e.expenses, 0) - coalesce(sal.salaries, 0) as net
from d
left join s on s.date = d.date
left join p on p.date = d.date
left join e on e.date = d.date
left join sal on sal.date = d.date;

create view v_production_recon with (security_invoker = true) as
with prod as (
  select date, product_id, sum(raw_qty) as raw_qty, sum(qty_produced) as produced
  from production_batches group by 1, 2
),
sold as (
  select (o.created_at_local at time zone 'Asia/Karachi')::date as date, mi.product_id,
    sum(oi.qty * mi.product_qty_per_unit) as sold
  from order_items oi
  join orders o on o.id = oi.order_id and o.status = 'paid'
  join menu_items mi on mi.id = oi.menu_item_id
  where mi.product_id is not null
  group by 1, 2
),
k as (
  select date, product_id from prod
  union select date, product_id from sold
  union select date, product_id from day_closings
)
select k.date, k.product_id, pr.name as product_name,
  coalesce(dc.opening_qty, 0) as opening_qty,
  coalesce(p.raw_qty, 0) as raw_qty,
  coalesce(p.produced, 0) as produced_qty,
  case when p.raw_qty > 0 then round(p.produced / p.raw_qty, 2) end as yield_per_kg,
  coalesce(s.sold, 0) as sold_qty,
  coalesce(dc.leftover_qty, 0) as leftover_qty,
  coalesce(dc.wastage_qty, 0) as wastage_qty,
  coalesce(dc.opening_qty, 0) + coalesce(p.produced, 0) - coalesce(s.sold, 0)
    - coalesce(dc.leftover_qty, 0) - coalesce(dc.wastage_qty, 0) as difference,
  dc.id is not null as is_closed
from k
join products pr on pr.id = k.product_id
left join prod p on p.date = k.date and p.product_id = k.product_id
left join sold s on s.date = k.date and s.product_id = k.product_id
left join day_closings dc on dc.date = k.date and dc.product_id = k.product_id;

create view v_raw_stock with (security_invoker = true) as
select r.id as raw_item_id, r.name, r.unit, r.is_active,
  coalesce(p.qty, 0) as purchased_qty,
  coalesce(u.qty, 0) as used_qty,
  coalesce(p.qty, 0) - coalesce(u.qty, 0) as balance_qty
from raw_items r
left join (select raw_item_id, sum(qty) as qty from purchases group by 1) p on p.raw_item_id = r.id
left join (select raw_item_id, sum(raw_qty) as qty from production_batches group by 1) u on u.raw_item_id = r.id;

create view v_supplier_ledger with (security_invoker = true) as
select s.id as supplier_id, s.name, s.phone, s.is_active,
  coalesce(p.total, 0) as purchased,
  coalesce(p.paid, 0) + coalesce(sp.amount, 0) as paid,
  coalesce(p.total, 0) - coalesce(p.paid, 0) - coalesce(sp.amount, 0) as balance
from suppliers s
left join (
  select supplier_id, sum(total) as total, coalesce(sum(total) filter (where is_paid), 0) as paid
  from purchases group by 1
) p on p.supplier_id = s.id
left join (select supplier_id, sum(amount) as amount from supplier_payments group by 1) sp on sp.supplier_id = s.id;

-- ───────────── Realtime + Storage ─────────────
alter publication supabase_realtime add table orders;

insert into storage.buckets (id, name, public) values ('logos', 'logos', true), ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy logos_read on storage.objects for select using (bucket_id = 'logos');
create policy logos_write on storage.objects for insert to authenticated with check (bucket_id = 'logos' and (select has_role('owner')));
create policy logos_update on storage.objects for update to authenticated using (bucket_id = 'logos' and (select has_role('owner')));
create policy receipts_read on storage.objects for select to authenticated using (bucket_id = 'receipts' and (select has_role('owner','manager')));
create policy receipts_write on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and (select has_role('owner','manager')));

-- Cashier PIN brute-force protection (service role only; not granted to clients)
alter table profiles
  add column pin_failed_count int not null default 0,
  add column pin_locked_until timestamptz;

insert into settings (restaurant_name, address, phone, ntn, strn, pos_id, invoice_prefix, receipt_footer)
values ('Kabab House Mardan', 'Main Bazar, Mardan', '0300-0000000', '1234567-8', null, 'POS-01', 'KH-', 'Thank you! Please visit again.')
on conflict (branch_id) do nothing;

insert into categories (name, sort_order) values
  ('Kabab', 1), ('BBQ', 2), ('Bread', 3), ('Rice', 4), ('Drinks', 5), ('Extras', 6);

insert into products (name, unit) values ('Chapli Kabab', 'pcs'), ('Seekh Kabab', 'pcs'), ('Chicken Tikka', 'pcs');

insert into menu_items (category_id, name, price, unit, sort_order, product_id, product_qty_per_unit)
select c.id, m.name, m.price, m.unit, m.sort_order, p.id, m.per_unit
from (values
  ('Kabab',  'Chapli Kabab',        350, 'piece', 1, 'Chapli Kabab', 1),
  ('Kabab',  'Chapli Kabab Plate',  650, 'plate', 2, 'Chapli Kabab', 2),
  ('Kabab',  'Seekh Kabab',         150, 'seekh', 3, 'Seekh Kabab', 1),
  ('BBQ',    'Chicken Tikka',       450, 'piece', 1, 'Chicken Tikka', 1),
  ('Bread',  'Naan',                 30, 'piece', 1, null, 0),
  ('Rice',   'Plain Rice',          250, 'plate', 1, null, 0),
  ('Extras', 'Raita',                60, 'piece', 1, null, 0),
  ('Extras', 'Salad',                80, 'plate', 2, null, 0),
  ('Drinks', 'Cold Drink 500ml',    120, 'piece', 1, null, 0),
  ('Drinks', 'Mineral Water 500ml',  60, 'piece', 2, null, 0)
) as m(category, name, price, unit, sort_order, product, per_unit)
join categories c on c.name = m.category
left join products p on p.name = m.product;

insert into raw_items (name, unit) values
  ('Qeema', 'kg'), ('Gosht', 'kg'), ('Chicken', 'kg'), ('Masala', 'kg'), ('Oil', 'litre'), ('Aata', 'kg'),
  ('Onion', 'kg'), ('Tomato', 'kg'), ('Coal', 'kg'), ('Gas Cylinder', 'piece');

insert into suppliers (name, phone) values ('Local Butcher', null), ('Sabzi Mandi', null), ('Kiryana Store', null);

insert into expense_categories (name) values
  ('Electricity'), ('Gas'), ('Rent'), ('Repairs'), ('Packaging'), ('Transport'), ('Misc');

-- Users created before this script have no profile: give them one. Oldest user becomes owner.
insert into profiles (id, full_name, username, role)
select u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  lower(coalesce(nullif(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1))),
  case when row_number() over (order by u.created_at) = 1 then 'owner'::user_role else 'cashier'::user_role end
from auth.users u
on conflict (id) do nothing;
