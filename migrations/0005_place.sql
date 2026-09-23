-- Where the phone placed someone. They do not pick a constituency.
alter table profiles add column if not exists address text not null default '';
alter table profiles add column if not exists ghana_post text not null default '';
alter table profiles add column if not exists loc_lat double precision;
alter table profiles add column if not exists loc_lng double precision;
