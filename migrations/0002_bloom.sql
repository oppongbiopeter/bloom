-- Bloom platform schema

create table if not exists profiles (
  user_id text primary key,
  account_type text not null default 'personal',
  display_name text not null default '',
  company_name text not null default '',
  phone text not null default '',
  city text not null default 'Accra',
  florist_slug text,
  created_at timestamptz not null default now()
);

create table if not exists stations (
  id text primary key,
  name text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null
);

create table if not exists florists (
  slug text primary key,
  name text not null,
  city text not null,
  story text not null,
  commission_pct numeric not null default 12,
  lead_days int not null default 1,
  lat double precision not null,
  lng double precision not null
);

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  color text not null,
  type text not null,
  price numeric not null,
  unit text not null default 'stem',
  grams_per_unit numeric not null default 45,
  img text not null,
  blurb text not null,
  origin text not null,
  florist_slug text,
  lead_days int not null default 3,
  sponsored boolean not null default false
);

create table if not exists calendar_events (
  id serial primary key,
  user_id text not null,
  title text not null,
  person_name text not null default '',
  kind text not null,
  event_date date not null,
  reminder_days int not null default 7,
  notes text not null default '',
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_user_idx on calendar_events (user_id);

create table if not exists contacts (
  id serial primary key,
  user_id text not null,
  name text not null,
  address text not null default '',
  city text not null default 'Accra',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists contacts_user_idx on contacts (user_id);

create table if not exists orders (
  id serial primary key,
  user_id text not null,
  status text not null default 'PLACED',
  is_batch boolean not null default false,
  florist_slug text,
  product_summary text not null default '',
  stems int not null default 0,
  grams numeric not null default 0,
  merchandise numeric not null default 0,
  delivery_fee numeric not null default 0,
  addons_fee numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id);

create table if not exists order_gifts (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  user_id text not null,
  recipient_name text not null,
  address text not null,
  city text not null,
  phone text not null default '',
  message text not null default '',
  grams numeric not null,
  package_type text not null default 'kraft',
  addons text not null default '',
  station_id text not null,
  delivery_fee numeric not null default 0,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'QUEUED'
);
create index if not exists order_gifts_order_idx on order_gifts (order_id);
create index if not exists order_gifts_user_idx on order_gifts (user_id);

insert into stations (id, name, city, lat, lng) values
  ('acc-a', 'Kotoka Cold Room Hub A', 'Accra', 5.605186, -0.166786),
  ('legon', 'East Legon Sorting Centre', 'Accra', 5.6362, -0.1514),
  ('osu', 'Osu Last-Mile Hub', 'Accra', 5.558, -0.182),
  ('tema', 'Tema Reefer Yard', 'Tema', 5.669, 0.0168),
  ('kumasi', 'Kumasi Cold Hub', 'Kumasi', 6.688, -1.624),
  ('takoradi', 'Takoradi Coastal Hub', 'Takoradi', 4.901, -1.759)
on conflict (id) do nothing;

insert into florists (slug, name, city, story, commission_pct, lead_days, lat, lng) values
  ('osu-petals', 'Osu Petals', 'Accra', 'Same-day wrapped bouquets from Oxford Street. We fulfil Bloom marketplace orders and keep 88%.', 12, 1, 5.557, -0.183),
  ('labone-stem', 'Labone Stem Co.', 'Accra', 'Hotel and embassy contracts. Hat boxes and hampers ready by 10am.', 12, 1, 5.569, -0.171),
  ('kumasi-bloom', 'Kumasi Bloom Room', 'Kumasi', 'Ashanti wedding specialists. Bloom delivers on commission or we dispatch ourselves.', 15, 1, 6.69, -1.62)
on conflict (slug) do nothing;

insert into products (id, name, category, color, type, price, unit, grams_per_unit, img, blurb, origin, florist_slug, lead_days, sponsored) values
  ('mansfield', 'Mansfield Park', 'Roses', 'Light pink', 'Garden spray rose', 18.50, 'stem', 45, '/flowers/mansfield.jpg', 'Charming spray rose with multiple delicate blooms and a soft romantic pink. A favourite for bouquets and events.', 'Naivasha, Kenya', null, 3, true),
  ('giselle', 'Giselle', 'Roses', 'Pink', 'Garden spray rose', 20.80, 'stem', 45, '/flowers/giselle.jpg', 'Peachy-pink spray rose with clustered heads. Holds well in Accra heat after cold-chain handover.', 'Naivasha, Kenya', null, 3, false),
  ('julietta', 'Julietta', 'Roses', 'Peach', 'Garden spray rose', 21.60, 'stem', 48, '/flowers/julietta.jpg', 'Warm peach garden spray. Excellent for bridal work and hotel contracts across Greater Accra.', 'Nanyuki, Kenya', null, 3, false),
  ('fancy', 'Fancy Blossom', 'Roses', 'Pink', 'Garden spray rose', 20.10, 'stem', 45, '/flowers/fancy.jpg', 'Pale blush spray with a classic spiral. Reliable stem length for wholesale bunches.', 'Thika, Kenya', null, 3, false),
  ('naomi', 'Red Naomi', 'Roses', 'Red', 'Hybrid tea rose', 24.00, 'stem', 55, '/flowers/naomi.jpg', 'Long-stem red hybrid tea. The export workhorse for Valentine and corporate gifting.', 'Naivasha, Kenya', null, 3, true),
  ('east-legon-mix', 'East Legon Mix', 'Bouquets', 'Mixed blush', 'Arranged bouquet', 185, 'bunch', 400, '/flowers/rose-pink.jpg', 'Ready bouquet assembled at the Accra air-cargo cold hub. Priced per finished bunch.', 'Accra hub', null, 1, false),
  ('osu-blush', 'Oxford Street Blush', 'Local', 'Blush', 'Same-day bouquet', 220, 'bunch', 350, '/flowers/rose-peach.jpg', 'Osu Petals same-day wrap. Bloom takes a 12% marketplace commission.', 'Accra', 'osu-petals', 1, false),
  ('labone-hat', 'Labone Hat Box', 'Local', 'Cream', 'Hat box', 340, 'box', 500, '/flowers/rose-classic.jpg', 'Hat-box arrangement from Labone Stem Co. Embassy-ready presentation.', 'Accra', 'labone-stem', 1, false),
  ('ashanti-bridal', 'Ashanti Bridal Spray', 'Local', 'Ivory', 'Wedding spray', 28.00, 'stem', 50, '/flowers/julietta.jpg', 'Kumasi Bloom Room bridal spray. Commission 15% when Bloom delivers.', 'Kumasi', 'kumasi-bloom', 2, false)
on conflict (id) do nothing;
