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
