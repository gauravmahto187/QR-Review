begin;
drop policy "Admins manage payment QR images" on storage.objects;
create policy "Admins manage payment QR images" on storage.objects for all to authenticated
using (bucket_id='business-payment-qrs' and (select public.is_admin()))
with check (bucket_id='business-payment-qrs' and (select public.is_admin())
 and name ~ '^[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+[.]png$'
 and exists (
   select 1 from public.businesses b
   where b.id::text=(storage.foldername(storage.objects.name))[1]
 ));
commit;
