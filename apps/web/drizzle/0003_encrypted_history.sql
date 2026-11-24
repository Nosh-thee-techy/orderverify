-- Encrypted order and M-Pesa history for each seller, plus cross-shop dismissal audit.

alter table orders add column if not exists seller_id text;
update orders o set seller_id = b.seller_id from batches b where b.id = o.batch_id;
update orders set seller_id = 'legacy' where seller_id is null;
alter table orders alter column seller_id set not null;
alter table orders drop constraint if exists orders_seller_id_fkey;
alter table orders
  add constraint orders_seller_id_fkey foreign key (seller_id) references sellers(id) on delete cascade;

alter table orders add column if not exists source text not null default 'upload';
alter table orders add column if not exists buyer_name_enc text;
alter table orders add column if not exists buyer_name_hash text;
alter table orders add column if not exists buyer_phone_enc text;
alter table orders add column if not exists buyer_phone_hash text;
alter table orders add column if not exists item_summary text not null default '';
alter table orders add column if not exists claimed_amount_kes int;
alter table orders add column if not exists claimed_code_enc text;
alter table orders add column if not exists claimed_code_hash text;
alter table orders add column if not exists verdict text;
alter table orders add column if not exists engine_verdict text;
alter table orders add column if not exists tier text;
alter table orders add column if not exists reasons jsonb not null default '[]'::jsonb;
alter table orders add column if not exists dismissed_cross_flag boolean not null default false;
alter table orders add column if not exists created_at timestamptz not null default now();

alter table orders alter column customer_name set default '';

create table if not exists mpesa_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  seller_id text not null references sellers(id) on delete cascade,
  trans_code_enc text not null,
  trans_code_hash text not null,
  amount_kes int,
  payer_name_enc text,
  payer_name_hash text,
  payer_phone_enc text,
  payer_phone_hash text,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists mpesa_records_code_seller on mpesa_records (trans_code_hash, seller_id);
create index if not exists mpesa_records_seller_idx on mpesa_records (seller_id, created_at desc);
create index if not exists orders_seller_idx on orders (seller_id, created_at desc);
create index if not exists orders_name_hash_idx on orders (seller_id, buyer_name_hash);
create index if not exists orders_code_hash_idx on orders (claimed_code_hash);
create index if not exists orders_phone_hash_idx on orders (seller_id, buyer_phone_hash);

create table if not exists cross_flag_dismissals (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null references sellers(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
