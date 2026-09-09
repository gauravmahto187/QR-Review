begin;
set lock_timeout = '10s';
set statement_timeout = '2min';

-- Preserve pre-correction URLs solely as admin-readable migration history.
create table if not exists public.legacy_payment_destinations (
  link_id uuid primary key, business_id uuid not null references public.businesses(id),
  provider text not null, destination text not null, archived_at timestamptz not null default now()
);
alter table public.legacy_payment_destinations enable row level security;
revoke all on public.legacy_payment_destinations from anon, authenticated;
grant select on public.legacy_payment_destinations to authenticated;
grant all on public.legacy_payment_destinations to service_role;
drop policy if exists "Admins read legacy payment destinations" on public.legacy_payment_destinations;
create policy "Admins read legacy payment destinations" on public.legacy_payment_destinations for select to authenticated using ((select public.is_admin()));
insert into public.legacy_payment_destinations(link_id,business_id,provider,destination)
select id,business_id,type,url from public.business_smart_links where type in ('ESEWA','FONEPAY') and url is not null on conflict (link_id) do nothing;
alter table public.business_smart_links alter column url drop not null;
alter table public.business_smart_links add column if not exists image_path text;
update public.business_smart_links set url=null,is_active=false where type in ('ESEWA','FONEPAY') and url is not null;
alter table public.business_smart_links drop constraint if exists smart_link_destination_kind;
alter table public.business_smart_links add constraint smart_link_destination_kind check (
 (type in ('ESEWA','FONEPAY') and url is null and (not is_active or image_path is not null)
  and (image_path is null or image_path ~ ('^' || business_id::text || '/' || lower(type) || '/[a-f0-9-]+[.]png$')))
 or (type not in ('ESEWA','FONEPAY') and url is not null and image_path is null)
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('business-payment-qrs','business-payment-qrs',false,2097152,array['image/png','image/jpeg','image/webp']) on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Admins manage payment QR images" on storage.objects;
create policy "Admins manage payment QR images" on storage.objects for all to authenticated
using (bucket_id='business-payment-qrs' and (select public.is_admin()))
with check (bucket_id='business-payment-qrs' and (select public.is_admin())
 and name ~ '^[a-f0-9-]+/(esewa|fonepay)/[a-f0-9-]+[.]png$'
 and exists (select 1 from public.businesses where id::text=(storage.foldername(name))[1]));

-- Keep historical SMART_LINK_CLICK payment rows; new views have distinct semantics.
alter table public.smart_link_events drop constraint if exists smart_link_events_event_type_check;
alter table public.smart_link_events drop constraint if exists smart_link_events_check;
alter table public.smart_link_events add constraint smart_link_events_event_type_check
check (event_type in ('SMART_PAGE_VIEW','SMART_LINK_CLICK','PAYMENT_QR_VIEW'));
alter table public.smart_link_events add constraint smart_link_events_check check (
 (event_type='SMART_PAGE_VIEW' and link_type is null)
 or (event_type='SMART_LINK_CLICK' and link_type is not null)
 or (event_type='PAYMENT_QR_VIEW' and link_type in ('ESEWA','FONEPAY'))
);
drop function if exists public.apply_smart_link_action(uuid,text,uuid,text,text,text,boolean,text);
create or replace function public.apply_smart_link_action(
  p_business_id uuid, p_action text, p_link_id uuid default null,
  p_type text default null, p_label text default '', p_url text default null,
  p_is_active boolean default true, p_direction text default null, p_image_path text default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_link public.business_smart_links%rowtype;
  v_target public.business_smart_links%rowtype;
  v_id uuid;
  v_order integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator authorization required.' using errcode = '42501';
  end if;
  -- Serialize all UI mutations for a business, including creates and moves.
  perform 1 from public.businesses where id = p_business_id for update;
  if not found then raise exception 'Business not found.'; end if;
  if p_action in ('CREATE','UPDATE') then
    if p_type in ('ESEWA','FONEPAY') then
      if p_url is not null then raise exception 'Payment URLs are not supported.'; end if;
      if p_image_path is not null and (p_image_path !~ ('^' || p_business_id::text || '/' || lower(p_type) || '/[a-f0-9-]+[.]png$') or not exists (select 1 from storage.objects where bucket_id='business-payment-qrs' and name=p_image_path)) then raise exception 'Invalid payment image.'; end if;
      if p_is_active and p_image_path is null then raise exception 'Upload a QR image before enabling this provider.'; end if;
    elsif p_image_path is not null then raise exception 'Only payment providers support images.';
    end if;
  end if;
  if p_action = 'CREATE' then
    select coalesce(max(sort_order), -1) + 1 into v_order from public.business_smart_links where business_id = p_business_id;
    insert into public.business_smart_links(business_id,type,label,url,sort_order,is_active,image_path)
    values(p_business_id,p_type,p_label,p_url,v_order,p_is_active,p_image_path) returning id into v_id;
  else
    select * into v_link from public.business_smart_links where business_id = p_business_id and id = p_link_id for update;
    if not found then raise exception 'Link not found.'; end if;
    v_id := v_link.id;
    if p_action = 'UPDATE' then
      update public.business_smart_links set type=p_type,label=p_label,url=p_url,image_path=p_image_path,is_active=p_is_active,updated_at=now() where id=v_id;
    elsif p_action = 'DELETE' then
      delete from public.business_smart_links where id=v_id;
    elsif p_action = 'MOVE' then
      if p_direction not in ('UP','DOWN') or p_direction is null then raise exception 'Invalid direction.'; end if;
      select * into v_target from public.business_smart_links where business_id=p_business_id
        and ((p_direction='UP' and sort_order < v_link.sort_order) or (p_direction='DOWN' and sort_order > v_link.sort_order))
        order by case when p_direction='UP' then -sort_order else sort_order end limit 1;
      if found then
        set constraints public.smart_links_order_unique deferred;
        update public.business_smart_links set sort_order=case when id=v_id then v_target.sort_order else v_link.sort_order end,updated_at=now()
          where id in (v_id,v_target.id);
        set constraints public.smart_links_order_unique immediate;
      end if;
    else raise exception 'Invalid action.';
    end if;
  end if;
  insert into public.audit_logs(admin_user_id,business_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),p_business_id,'SMART_LINK_' || p_action,'business_smart_link',v_id,'{}');
  return v_id;
end;
$$;
revoke all on function public.apply_smart_link_action(uuid,text,uuid,text,text,text,boolean,text,text) from public, anon;
grant execute on function public.apply_smart_link_action(uuid,text,uuid,text,text,text,boolean,text,text) to authenticated;

commit;
