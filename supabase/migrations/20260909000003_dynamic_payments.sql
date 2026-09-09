begin;
set lock_timeout = '10s';
set statement_timeout = '2min';

create table public.business_payment_qrs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  image_path text not null,
  sort_order integer not null check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_qrs_order_unique unique (business_id,sort_order) deferrable initially immediate,
  constraint payment_qrs_path check (
    image_path ~ ('^' || business_id::text || '/(' || id::text || '|esewa|fonepay|khalti)/[a-f0-9-]+[.]png$')
  )
);
alter table public.business_payment_qrs enable row level security;
revoke all on public.business_payment_qrs from anon;
grant select,insert,update,delete on public.business_payment_qrs to authenticated;
grant all on public.business_payment_qrs to service_role;
create policy "Admins manage payment methods" on public.business_payment_qrs for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger payment_qrs_set_updated_at before update on public.business_payment_qrs
for each row execute function public.set_updated_at();

-- Keep IDs, paths, enabled state and ordering. Legacy rows without images remain
-- in the old table, hidden from the new UI; they are not usable payment methods.
insert into public.business_payment_qrs(id,business_id,name,image_path,sort_order,is_active,created_at,updated_at)
select id,business_id,case type when 'ESEWA' then 'eSewa' when 'FONEPAY' then 'Fonepay' when 'KHALTI' then 'Khalti' else type end,
image_path,sort_order,is_active,created_at,updated_at
from public.business_smart_links where type in ('ESEWA','FONEPAY','KHALTI') and image_path is not null;

drop policy "Admins manage payment QR images" on storage.objects;
create policy "Admins manage payment QR images" on storage.objects for all to authenticated
using (bucket_id='business-payment-qrs' and (select public.is_admin()))
with check (bucket_id='business-payment-qrs' and (select public.is_admin())
 and name ~ '^[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+[.]png$'
 and exists (select 1 from public.businesses where id::text=(storage.foldername(name))[1]));

alter table public.smart_link_events add column payment_method_id uuid;
-- This identifier intentionally has no cascading FK: historical views survive removal.
create index smart_payment_events_method on public.smart_link_events(business_id,event_type,payment_method_id);
alter table public.smart_link_events drop constraint smart_link_events_event_type_check;
alter table public.smart_link_events drop constraint smart_link_events_check;
alter table public.smart_link_events add constraint smart_link_events_event_type_check
check (event_type in ('SMART_PAGE_VIEW','SMART_LINK_CLICK','PAYMENT_PAGE_VIEW','PAYMENT_QR_VIEW'));
alter table public.smart_link_events add constraint smart_link_events_check check (
 (event_type in ('SMART_PAGE_VIEW','PAYMENT_PAGE_VIEW') and link_type is null and payment_method_id is null)
 or (event_type='SMART_LINK_CLICK' and link_type is not null and payment_method_id is null)
 or (event_type='PAYMENT_QR_VIEW' and
   ((payment_method_id is not null and link_type is null) or (payment_method_id is null and link_type in ('ESEWA','FONEPAY'))))
);

create function public.apply_payment_qr_action(
 p_business_id uuid,p_action text,p_payment_id uuid,
 p_name text default null,p_image_path text default null,p_is_active boolean default true,p_direction text default null
) returns uuid language plpgsql set search_path='' as $$
declare
 v_row public.business_payment_qrs%rowtype;
 v_target public.business_payment_qrs%rowtype;
 v_order integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator authorization required.' using errcode='42501'; end if;
 perform 1 from public.businesses where id=p_business_id for update;
 if not found then raise exception 'Business not found.'; end if;
 if p_action <> 'CREATE' then
   select * into v_row from public.business_payment_qrs where id=p_payment_id and business_id=p_business_id for update;
   if not found then raise exception 'Payment method not found.'; end if;
 end if;
 if p_action in ('CREATE','UPDATE') then
   if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Payment name required.'; end if;
   if p_image_path is null then raise exception 'Payment QR image required.'; end if;
   -- New uploads use IDs, never provider names. Existing migrated paths may be retained.
   if (p_action='CREATE' or p_image_path is distinct from v_row.image_path)
      and p_image_path !~ ('^' || p_business_id::text || '/' || p_payment_id::text || '/[a-f0-9-]+[.]png$') then raise exception 'Invalid image path.'; end if;
   if not exists (select 1 from storage.objects where bucket_id='business-payment-qrs' and name=p_image_path) then raise exception 'Payment QR image not found.'; end if;
 end if;
 if p_action='CREATE' then
   select coalesce(max(sort_order),-1)+1 into v_order from public.business_payment_qrs where business_id=p_business_id;
   insert into public.business_payment_qrs(id,business_id,name,image_path,sort_order,is_active)
   values(p_payment_id,p_business_id,btrim(p_name),p_image_path,v_order,p_is_active);
 elsif p_action='UPDATE' then
   update public.business_payment_qrs set name=btrim(p_name),image_path=p_image_path,is_active=p_is_active where id=p_payment_id;
 elsif p_action='DELETE' then
   delete from public.business_payment_qrs where id=p_payment_id;
 elsif p_action='MOVE' then
   if p_direction is null or p_direction not in ('UP','DOWN') then raise exception 'Invalid direction.'; end if;
   select * into v_target from public.business_payment_qrs where business_id=p_business_id
   and ((p_direction='UP' and sort_order<v_row.sort_order) or (p_direction='DOWN' and sort_order>v_row.sort_order))
   order by case when p_direction='UP' then -sort_order else sort_order end limit 1;
   if found then
     set constraints public.payment_qrs_order_unique deferred;
     update public.business_payment_qrs set sort_order=case when id=p_payment_id then v_target.sort_order else v_row.sort_order end where id in(p_payment_id,v_target.id);
     set constraints public.payment_qrs_order_unique immediate;
   end if;
 else raise exception 'Invalid action.';
 end if;
 insert into public.audit_logs(admin_user_id,business_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),p_business_id,'PAYMENT_QR_' || p_action,'business_payment_qr',p_payment_id,'{}');
 return p_payment_id;
end;
$$;
revoke all on function public.apply_payment_qr_action(uuid,text,uuid,text,text,boolean,text) from public,anon;
grant execute on function public.apply_payment_qr_action(uuid,text,uuid,text,text,boolean,text) to authenticated;
commit;
