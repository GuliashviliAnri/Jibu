-- Run this small diagnostic separately if the v2 migration reports a type error.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where (table_schema = 'public' and table_name in (
  'profiles', 'wallets', 'wallet_transactions', 'properties',
  'property_photos', 'favorites', 'property_views',
  'property_promotions', 'property_refreshes', 'broker_subscriptions',
  'broker_sheet_rows', 'payments', 'notifications', 'media_assets'
)) or (table_schema = 'storage' and table_name = 'objects'
  and column_name in ('id', 'owner_id', 'bucket_id', 'name'))
order by table_schema, table_name, ordinal_position;
