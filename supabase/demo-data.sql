-- DEMO DATA (optional): 14 days of orders, production, closings, purchases, expenses, staff & salary.
-- Paste into Supabase → SQL Editor → Run, after setup. Demo invoices use prefix DM-.
-- Remove later with the cleanup block at the bottom.
do $$
declare
  v_owner uuid := (select id from profiles where role = 'owner' order by created_at limit 1);
  v_day date; v_d int; v_n int; v_oid uuid; v_k int; v_mi record; v_pr record;
  v_sub numeric; v_disc numeric; v_tax numeric; v_tot numeric; v_recv numeric;
  v_pm payment_method; v_ot order_type;
  v_sold numeric; v_made numeric; v_raw numeric; v_open numeric; v_waste numeric; v_gap numeric; v_left numeric;
  v_qeema uuid := (select id from raw_items where name = 'Qeema');
  v_chicken uuid := (select id from raw_items where name = 'Chicken');
  v_butcher uuid := (select id from suppliers where name = 'Local Butcher');
  v_sabzi uuid := (select id from suppliers where name = 'Sabzi Mandi');
  v_kiryana uuid := (select id from suppliers where name = 'Kiryana Store');
  v_cat uuid; v_staff record;
begin
  if v_owner is null then raise exception 'No owner profile found — run setup first'; end if;

  -- Orders
  for v_d in 0..13 loop
    v_day := pk_today() - v_d;
    for v_n in 1..(14 + floor(random() * 18))::int loop
      v_oid := gen_random_uuid();
      v_ot := (array['dine_in','dine_in','takeaway','takeaway','delivery'])[1 + floor(random() * 5)]::order_type;
      v_pm := (array['cash','cash','cash','cash','card','jazzcash','easypaisa'])[1 + floor(random() * 7)]::payment_method;
      insert into orders (id, invoice_no, order_type, table_no, status, cashier_id, device_id, created_at_local, created_by)
      values (v_oid, 'DM-' || to_char(v_day, 'YYMMDD') || '-' || lpad(v_n::text, 4, '0'), v_ot,
        case when v_ot = 'dine_in' then (1 + floor(random() * 12))::text end, 'paid', v_owner, 'demo',
        (v_day + time '12:00' + random() * interval '11 hours') at time zone 'Asia/Karachi', v_owner);
      for v_mi in select id, name, price from menu_items order by random() limit (1 + floor(random() * 4))::int loop
        v_k := 1 + floor(random() * 3);
        insert into order_items (id, order_id, menu_item_id, name_snapshot, unit_price, qty, line_total, created_by)
        values (gen_random_uuid(), v_oid, v_mi.id, v_mi.name, v_mi.price, v_k, v_mi.price * v_k, v_owner);
      end loop;
      select sum(line_total) into v_sub from order_items where order_id = v_oid;
      v_disc := case when random() < 0.12 then round(v_sub * 0.05) else 0 end;
      v_tax := round((v_sub - v_disc) * 0.15);
      v_tot := v_sub - v_disc + v_tax;
      v_recv := case when v_pm = 'cash' then ceil(v_tot / 500) * 500 else v_tot end;
      update orders set subtotal = v_sub, discount = v_disc, tax_amount = v_tax, total = v_tot,
        payment_method = v_pm, amount_received = v_recv, change_due = v_recv - v_tot
      where id = v_oid;
      if random() < 0.03 then
        update orders set status = 'void', void_reason = 'Customer cancelled (demo)' where id = v_oid;
      end if;
    end loop;
  end loop;

  -- Production (made = sold + spare) and day closings (not today, so you can try closing yourself)
  for v_pr in select id, name from products loop
    v_open := 0;
    for v_d in reverse 13..0 loop
      v_day := pk_today() - v_d;
      select coalesce(sum(oi.qty * mi.product_qty_per_unit), 0) into v_sold
      from order_items oi join orders o on o.id = oi.order_id and o.status = 'paid'
      join menu_items mi on mi.id = oi.menu_item_id
      where mi.product_id = v_pr.id and (o.created_at_local at time zone 'Asia/Karachi')::date = v_day;
      v_made := greatest(0, ceil(v_sold) - v_open) + 5 + floor(random() * 15);
      v_raw := round((v_made / (case when v_pr.name = 'Chicken Tikka' then 7 + random() * 2 else 17.5 + random() * 4 end))::numeric, 1);
      insert into production_batches (date, raw_item_id, raw_qty, product_id, qty_produced, note, created_by)
      values (v_day, case when v_pr.name = 'Chicken Tikka' then v_chicken else v_qeema end, v_raw, v_pr.id, v_made, 'demo', v_owner);
      if v_d > 0 then
        v_waste := floor(random() * 3);
        v_gap := case when random() < 0.25 then 1 + floor(random() * 3) else 0 end;
        v_left := greatest(0, v_open + v_made - v_sold - v_waste - v_gap);
        insert into day_closings (date, product_id, opening_qty, produced_qty, sold_qty, leftover_qty, wastage_qty, difference, closed_by, created_by)
        values (v_day, v_pr.id, v_open, v_made, v_sold, v_left, v_waste, v_open + v_made - v_sold - v_left - v_waste, v_owner, v_owner);
        v_open := v_left;
      end if;
    end loop;
  end loop;

  -- Purchases
  for v_d in 0..13 loop
    v_day := pk_today() - v_d;
    insert into purchases (date, raw_item_id, supplier_id, qty, rate, total, is_paid, note, created_by)
    select v_day, x.item, x.sup, x.qty, x.rate, round(x.qty * x.rate, 2), random() < 0.8, 'demo', v_owner
    from (values
      (v_qeema, v_butcher, (select coalesce(sum(raw_qty), 10) from production_batches where date = v_day and raw_item_id = v_qeema), 1200::numeric),
      (v_chicken, v_butcher, (select coalesce(sum(raw_qty), 4) from production_batches where date = v_day and raw_item_id = v_chicken), 650),
      ((select id from raw_items where name = 'Onion'), v_sabzi, 5, 120),
      ((select id from raw_items where name = 'Tomato'), v_sabzi, 4, 150),
      ((select id from raw_items where name = 'Coal'), v_kiryana, 10, 80)
    ) as x(item, sup, qty, rate);
    if v_d % 3 = 0 then
      insert into purchases (date, raw_item_id, supplier_id, qty, rate, total, is_paid, note, created_by) values
        (v_day, (select id from raw_items where name = 'Oil'), v_kiryana, 5, 550, 2750, true, 'demo', v_owner),
        (v_day, (select id from raw_items where name = 'Masala'), v_kiryana, 2, 900, 1800, true, 'demo', v_owner),
        (v_day, (select id from raw_items where name = 'Aata'), v_kiryana, 20, 140, 2800, true, 'demo', v_owner);
    end if;
  end loop;
  insert into supplier_payments (supplier_id, date, amount, note, created_by) values
    (v_butcher, pk_today() - 7, 25000, 'demo', v_owner), (v_sabzi, pk_today() - 3, 3000, 'demo', v_owner);

  -- Expenses
  for v_d in 0..13 loop
    v_day := pk_today() - v_d;
    insert into expenses (date, category_id, amount, payment_method, note, created_by)
    values (v_day, (select id from expense_categories where name = 'Gas'), 1500 + floor(random() * 1000), 'cash', 'Cylinder refill (demo)', v_owner);
    if v_d % 2 = 0 then
      insert into expenses (date, category_id, amount, payment_method, note, created_by)
      values (v_day, (select id from expense_categories where name = 'Packaging'), 800, 'cash', 'Boxes & bags (demo)', v_owner);
    end if;
  end loop;
  insert into expenses (date, category_id, amount, payment_method, note, created_by) values
    (pk_today() - 10, (select id from expense_categories where name = 'Electricity'), 18500, 'jazzcash', 'WAPDA bill (demo)', v_owner),
    (pk_today() - 12, (select id from expense_categories where name = 'Rent'), 60000, 'cash', 'Shop rent (demo)', v_owner),
    (pk_today() - 5, (select id from expense_categories where name = 'Repairs'), 3500, 'cash', 'Grill repair (demo)', v_owner),
    (pk_today() - 2, (select id from expense_categories where name = 'Transport'), 1200, 'cash', 'Rickshaw (demo)', v_owner);

  -- Staff & salary
  insert into staff (name, phone, designation, monthly_salary, joining_date, created_by) values
    ('Gul Khan', '0311-1111111', 'Head Cook', 35000, '2025-03-01', v_owner),
    ('Imran', '0312-2222222', 'Helper', 22000, '2025-06-15', v_owner),
    ('Bilal', '0313-3333333', 'Waiter', 20000, '2025-08-01', v_owner),
    ('Shahid', '0314-4444444', 'Waiter', 20000, '2026-01-10', v_owner),
    ('Rafiq', '0315-5555555', 'Cleaner', 15000, '2026-02-01', v_owner);
  for v_staff in select id, monthly_salary from staff loop
    insert into salary_payments (staff_id, month, base_salary, advances_deducted, amount_paid, paid_on, note, created_by)
    values (v_staff.id, (date_trunc('month', pk_today()) - interval '1 month')::date, v_staff.monthly_salary, 0, v_staff.monthly_salary,
      date_trunc('month', pk_today())::date + 1, 'demo', v_owner);
  end loop;
  insert into salary_advances (staff_id, date, amount, note, created_by)
  select id, pk_today() - 4, 5000, 'demo', v_owner from staff where name in ('Imran', 'Bilal');
end $$;

-- CLEANUP (run when you want to remove all demo data):
-- delete from order_items where order_id in (select id from orders where device_id = 'demo');
-- delete from orders where device_id = 'demo';
-- delete from day_closings where date between pk_today() - 13 and pk_today() - 1 and date < (select min(created_at)::date from orders where device_id <> 'demo' or device_id is null);
-- delete from production_batches where note = 'demo';
-- delete from purchases where note = 'demo';
-- delete from supplier_payments where note = 'demo';
-- delete from expenses where note like '%(demo)';
-- delete from salary_payments where note = 'demo';
-- delete from salary_advances where note = 'demo';
-- delete from staff where phone like '031_-_______' and name in ('Gul Khan','Imran','Bilal','Shahid','Rafiq');
