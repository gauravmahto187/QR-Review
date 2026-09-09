begin;
set lock_timeout = '10s';
set statement_timeout = '2min';

drop function public.delete_business_permanently(uuid, text);

create function public.delete_business_permanently(p_business_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_business public.businesses%rowtype;
  v_job public.business_deletion_cleanup%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  select * into v_business from public.businesses where id = p_business_id for update;
  if not found then
    select * into v_job from public.business_deletion_cleanup where business_id = p_business_id;
    if not found then raise exception using errcode = 'P0002', message = 'BUSINESS_NOT_FOUND'; end if;
    update public.business_deletion_cleanup set objects = (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
      from storage.objects where bucket_id in ('business-logos', 'business-payment-qrs')
        and split_part(name, '/', 1) = p_business_id::text
    ) where business_id = p_business_id returning * into v_job;
    return to_jsonb(v_job);
  end if;

  insert into public.business_deletion_cleanup(business_id, business_name, slug, objects)
  select v_business.id, v_business.name, v_business.slug,
    coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
  from storage.objects
  where bucket_id in ('business-logos', 'business-payment-qrs')
    and split_part(name, '/', 1) = p_business_id::text;

  delete from public.analytics_events where business_id = p_business_id;
  delete from public.review_sessions where business_id = p_business_id;
  delete from public.subscriptions where business_id = p_business_id;
  delete from public.legacy_payment_destinations where business_id = p_business_id;
  delete from public.audit_logs where business_id = p_business_id;
  delete from public.businesses where id = p_business_id;
  select * into v_job from public.business_deletion_cleanup where business_id = p_business_id;
  return to_jsonb(v_job);
end;
$$;

revoke all on function public.delete_business_permanently(uuid) from public, anon;
grant execute on function public.delete_business_permanently(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
