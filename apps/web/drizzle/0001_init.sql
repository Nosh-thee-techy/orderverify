-- sellers: one demo seller to start; designed for many.
-- display_name: name in the greeting.
-- language: 'en' or 'sw'.
-- weekly_cap_kes: ceiling for paid checks this week.
-- agent_paused: when true the agent must not pay.
-- wallet_balance_usd: SIMULATED top-up credit, not the on-chain balance.
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  language text not null default 'en',
  weekly_cap_kes int not null default 50,
  agent_paused boolean not null default false,
  wallet_balance_usd numeric(12,7) not null default 0,
  created_at timestamptz not null default now()
);

-- batches: one "check my orders" run.
-- status: draft|ready|paying|verifying|done|blocked_cap|error
-- evidence_tier: TEXT_ONLY or STATEMENT_VERIFIED
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  status text not null default 'draft',
  evidence_tier text not null default 'TEXT_ONLY',
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text
);

-- orders: structured orders extracted from chat. Editable before the check.
-- customer_phone_hash: salted hash only. customer_phone_last3: last three digits.
-- items: [{name, qty, unitPriceKes?}]
-- claimed_code: code the buyer pasted, if any.
-- chat_excerpt: redacted. Blanked by the retention script.
-- seller_decision: null|released|held|more_info
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  customer_name text not null,
  customer_phone_hash text,
  customer_phone_last3 text,
  items jsonb not null,
  expected_amount_kes int,
  ordered_at timestamptz not null,
  claimed_code text,
  chat_excerpt text not null default '',
  seller_decision text,
  decided_at timestamptz
);

-- payment_evidence: raw M-Pesa messages, with parsed fields beside them.
create table if not exists payment_evidence (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  raw_text text not null,
  parsed jsonb,
  sender_label text
);

-- statement_rows: uploaded M-Pesa statement. Stronger than the SMS text.
create table if not exists statement_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  receipt_no text not null,
  completed_at timestamptz,
  details text not null default '',
  status text not null default '',
  paid_in_kes numeric,
  withdrawn_kes numeric
);

-- seen_codes: codes already accepted for this seller, so a later reuse is caught.
create table if not exists seen_codes (
  seller_id uuid not null references sellers(id) on delete cascade,
  code text not null,
  first_order_id uuid,
  first_seen_at timestamptz not null default now(),
  primary key (seller_id, code)
);

-- reports: the verification result, stored as the API returned it.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  engine_version text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

-- payments: every x402 attempt. status is pending|settled|failed|bypassed.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  amount_usd numeric(12,7) not null,
  status text not null,
  network text,
  tx_hash text,
  payer text,
  pay_to text,
  raw_settlement jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- agent_events: the live timeline. kind is parsed|requested|payment_required|signed|settled|report_received|held|cap_reached|paused|error
create table if not exists agent_events (
  id bigserial primary key,
  batch_id uuid not null references batches(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  message text not null,
  data jsonb
);

create index if not exists batches_seller_idx on batches (seller_id, created_at desc);
create index if not exists orders_batch_idx on orders (batch_id);
create index if not exists payments_seller_idx on payments (seller_id, created_at desc);
create index if not exists events_batch_idx on agent_events (batch_id, id);
