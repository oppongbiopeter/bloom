-- Catalogue rules from the v0.3 object model: drafts stay private until published.
alter table products add column if not exists sku text not null default '';
alter table products add column if not exists status text not null default 'published';
alter table products add column if not exists stock integer not null default 240;
alter table products add column if not exists pack_size integer not null default 10;
alter table products add column if not exists version integer not null default 1;
alter table products add column if not exists review_note text not null default '';

update products set sku = upper(id) where sku = '';
update products set pack_size = 1 where unit <> 'stem';

insert into products (id, name, category, color, type, price, unit, grams_per_unit, img, blurb, origin, florist_slug, lead_days, sponsored, sku, status, stock, pack_size, review_note) values
  ('amazing-magic', 'Amazing magic', 'Roses', 'Pink', 'Garden spray rose', 0, 'stem', 45, '/flowers/rose-pink.jpg', 'Draft from the source sheet. Not for sale until Bloom publishes a price, pack and stock.', 'Naivasha, Kenya', null, 3, false, 'DRAFT-001', 'draft', 0, 10, ''),
  ('silva-pink', 'Silva Pink', 'Roses', 'Pink', 'Garden spray rose', 0, 'stem', 45, '/flowers/giselle.jpg', 'Draft from the source sheet. Not for sale until Bloom publishes a price, pack and stock.', 'Naivasha, Kenya', null, 3, false, 'DRAFT-004', 'draft', 0, 10, ''),
  ('holly', 'Holly', 'Roses', 'Bi peach', 'Garden spray rose', 0, 'stem', 45, '/flowers/rose-peach.jpg', 'Draft from the source sheet. Not for sale until Bloom publishes a price, pack and stock.', 'Naivasha, Kenya', null, 3, false, 'DRAFT-006', 'draft', 0, 10, ''),
  ('madam-bombastic', 'Madam Bombastic', 'Roses', 'Peach', 'Garden spray rose', 0, 'stem', 48, '/flowers/julietta.jpg', 'Draft from the source sheet. Not for sale until Bloom publishes a price, pack and stock.', 'Naivasha, Kenya', null, 3, false, 'DRAFT-008', 'draft', 0, 10, ''),
  ('manfield-park-pink', 'Manfield Park Pink', 'Roses', 'Pink', 'Garden spray rose', 0, 'stem', 45, '/flowers/mansfield.jpg', 'Draft from the source sheet. Confirm the label before this can be sold.', 'Naivasha, Kenya', null, 3, false, 'DRAFT-009', 'draft', 0, 10, 'Source label reads Manfield. Minimum head size 4.0 cm. Verify spelling and whether this is a separate variety from Mansfield Park.')
on conflict (id) do nothing;

alter table orders add column if not exists client_key text;
create unique index if not exists orders_user_client_key on orders (user_id, client_key);

create table if not exists price_audits (
  id bigserial primary key,
  actor_id text not null,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
