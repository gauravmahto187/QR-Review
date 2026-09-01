set lock_timeout = '10s';
set statement_timeout = '2min';

create policy "Admins can manage business logos"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'business-logos'
  and (select public.is_admin())
)
with check (
  bucket_id = 'business-logos'
  and (select public.is_admin())
);

-- The business-logos bucket itself is configured in supabase/config.toml.
-- Public delivery uses the bucket's public object URLs; anonymous listing and
-- direct anonymous writes remain unavailable.
