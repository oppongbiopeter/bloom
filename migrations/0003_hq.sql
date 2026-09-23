-- Bloom HQ: company staff, tariffs, partners, ICUMS, cold rooms

alter table profiles add column if not exists staff_role text;
alter table profiles add column if not exists added_by text;

create index if not exists profiles_staff_role_idx on profiles (staff_role);

update profiles
  set staff_role = 'fulfilment', account_type = 'staff'
  where account_type = 'ops' and staff_role is null;

create table if not exists hq_settings (
  id text primary key,
  delivery_base numeric not null default 25,
  delivery_per_km numeric not null default 4.5,
  usd_ghs numeric not null default 15.20,
  air_freight_per_kg numeric not null default 18,
  ocean_freight_per_kg numeric not null default 6.50,
  icums_duty_pct numeric not null default 20,
  icums_vat_pct numeric not null default 15,
  nhil_pct numeric not null default 2.5,
  getfund_pct numeric not null default 2.5,
  updated_at timestamptz not null default now()
);

insert into hq_settings (id) values ('bloom') on conflict (id) do nothing;

create table if not exists partners (
  id text primary key,
  kind text not null,
  name text not null,
  city text not null default 'Accra',
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  status text not null default 'active',
  sla_hours int not null default 24,
  created_at timestamptz not null default now()
);

insert into partners (id, kind, name, city, contact_name, phone, notes, sla_hours) values
  ('ghanair', 'airline', 'Ghanair Cargo', 'Accra', 'Ramp desk', '0302-000-100', 'ACC air uplift from Naivasha via Nairobi. Cut-off 16:00.', 18),
  ('tema-reefer', 'cold_room', 'Tema Reefer Logistics', 'Tema', 'Yard lead', '0303-000-200', 'Ocean boxes off TEM. Holds 2–4°C, 40-pallet capacity.', 12),
  ('kotoka-cold', 'cold_room', 'Kotoka Cold Room Hub A', 'Accra', 'Night manager', '0302-000-110', 'Air-side cold room. Bloom primary ACC handover.', 6),
  ('accra-riders', '3pl', 'Accra Last-Mile Riders', 'Accra', 'Dispatch', '024-000-3000', 'Chilled vans for Greater Accra. Live ping every 3 min.', 4),
  ('lamptey-icum', 'customs_agent', 'Lamptey ICUMS Desk', 'Tema', 'Broker', '0303-000-210', 'GRA ICUMS filings for ACC air and TEM ocean.', 24)
on conflict (id) do nothing;

create table if not exists duty_filings (
  id serial primary key,
  reference text not null,
  consignment text not null,
  lane text not null,
  cif_ghs numeric not null,
  duty_ghs numeric not null,
  vat_ghs numeric not null,
  levies_ghs numeric not null,
  total_ghs numeric not null,
  status text not null default 'DRAFT',
  partner_id text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists cold_lots (
  id serial primary key,
  station_id text not null,
  partner_id text,
  lot_label text not null,
  variety text not null,
  kg numeric not null,
  temp_c numeric not null default 4,
  status text not null default 'IN_STORE',
  notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
