-- Cashier PIN brute-force protection (service role only; not granted to clients)
alter table profiles
  add column pin_failed_count int not null default 0,
  add column pin_locked_until timestamptz;
