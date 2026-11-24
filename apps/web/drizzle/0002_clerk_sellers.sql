-- Switch seller ids from uuid to Clerk user ids (text).
-- Existing batches are reassigned to a seeded "legacy" seller. Rows are kept, not deleted.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sellers' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table batches drop constraint if exists batches_seller_id_fkey;
    alter table payments drop constraint if exists payments_seller_id_fkey;
    alter table seen_codes drop constraint if exists seen_codes_seller_id_fkey;
    alter table seen_codes drop constraint if exists seen_codes_pkey;

    alter table sellers alter column id drop default;
    alter table sellers alter column id type text using id::text;
    alter table batches alter column seller_id type text using seller_id::text;
    alter table payments alter column seller_id type text using seller_id::text;
    alter table seen_codes alter column seller_id type text using seller_id::text;

    alter table seen_codes add primary key (seller_id, code);
  end if;
end $$;

alter table sellers add column if not exists email text not null default '';
alter table sellers add column if not exists whatsapp_number_enc text;

insert into sellers (id, display_name, email, language)
values ('legacy', 'Legacy', 'legacy@orderverify.local', 'en')
on conflict (id) do nothing;

-- Reassign only pre-Clerk uuid seller ids. Clerk user ids (user_...) stay put if this file is re-run.
update batches set seller_id = 'legacy'
  where seller_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update payments set seller_id = 'legacy'
  where seller_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update seen_codes set seller_id = 'legacy'
  where seller_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
delete from sellers
  where id <> 'legacy'
    and id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

alter table batches drop constraint if exists batches_seller_id_fkey;
alter table payments drop constraint if exists payments_seller_id_fkey;
alter table seen_codes drop constraint if exists seen_codes_seller_id_fkey;

alter table batches
  add constraint batches_seller_id_fkey foreign key (seller_id) references sellers(id) on delete cascade;
alter table payments
  add constraint payments_seller_id_fkey foreign key (seller_id) references sellers(id) on delete cascade;
alter table seen_codes
  add constraint seen_codes_seller_id_fkey foreign key (seller_id) references sellers(id) on delete cascade;
