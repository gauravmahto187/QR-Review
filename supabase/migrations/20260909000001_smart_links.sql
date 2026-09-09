set lock_timeout = '10s';
set statement_timeout = '2min';

create table public.business_smart_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('FACEBOOK','INSTAGRAM','TIKTOK','YOUTUBE','WHATSAPP','WEBSITE','GOOGLE_MAPS','PHONE','EMAIL','ESEWA','FONEPAY')),
  label text not null default '' check (char_length(label) <= 60),
  url text not null check (char_length(url) between 1 and 2048),
  sort_order integer not null check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smart_links_order_unique unique (business_id, sort_order) deferrable initially immediate
);
create unique index smart_links_active_type_unique on public.business_smart_links(business_id, type) where is_active;
create trigger smart_links_set_updated_at before update on public.business_smart_links
for each row execute function public.set_updated_at();
alter table public.business_smart_links enable row level security;
revoke all on public.business_smart_links from anon;
grant select, insert, update, delete on public.business_smart_links to authenticated;
grant all on public.business_smart_links to service_role;
create policy "Admins manage smart links" on public.business_smart_links for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

-- Separate event store keeps all existing review aggregates and semantics unchanged.
create table public.smart_link_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (event_type in ('SMART_PAGE_VIEW','SMART_LINK_CLICK')),
  link_type text check (link_type in ('FACEBOOK','INSTAGRAM','TIKTOK','YOUTUBE','WHATSAPP','WEBSITE','GOOGLE_MAPS','PHONE','EMAIL','ESEWA','FONEPAY')),
  created_at timestamptz not null default now(),
  check ((event_type = 'SMART_PAGE_VIEW' and link_type is null) or (event_type = 'SMART_LINK_CLICK' and link_type is not null))
);
create index smart_link_events_business_type on public.smart_link_events(business_id, event_type, link_type);
alter table public.smart_link_events enable row level security;
revoke all on public.smart_link_events from anon, authenticated;
grant select on public.smart_link_events to authenticated;
grant all on public.smart_link_events to service_role;
create policy "Admins read smart link metrics" on public.smart_link_events for select to authenticated using ((select public.is_admin()));

create function public.apply_smart_link_action(
  p_business_id uuid, p_action text, p_link_id uuid default null,
  p_type text default null, p_label text default '', p_url text default null,
  p_is_active boolean default true, p_direction text default null
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
  if p_action = 'CREATE' then
    select coalesce(max(sort_order), -1) + 1 into v_order from public.business_smart_links where business_id = p_business_id;
    insert into public.business_smart_links(business_id,type,label,url,sort_order,is_active)
    values(p_business_id,p_type,p_label,p_url,v_order,p_is_active) returning id into v_id;
  else
    select * into v_link from public.business_smart_links where business_id = p_business_id and id = p_link_id for update;
    if not found then raise exception 'Link not found.'; end if;
    v_id := v_link.id;
    if p_action = 'UPDATE' then
      update public.business_smart_links set type=p_type,label=p_label,url=p_url,is_active=p_is_active,updated_at=now() where id=v_id;
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
revoke all on function public.apply_smart_link_action(uuid,text,uuid,text,text,text,boolean,text) from public, anon;
grant execute on function public.apply_smart_link_action(uuid,text,uuid,text,text,text,boolean,text) to authenticated;
