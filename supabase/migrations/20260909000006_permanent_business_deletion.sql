begin;
set lock_timeout = '10s';
set statement_timeout = '2min';

-- Storage must be deleted through its API, after the database transaction commits.
-- Keep a retryable manifest until that cleanup succeeds.
create table public.business_deletion_cleanup (
  business_id uuid primary key,
  business_name text not null,
  slug text not null,
  objects jsonb not null check (jsonb_typeof(objects) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.business_deletion_cleanup enable row level security;
revoke all on public.business_deletion_cleanup from anon, authenticated;
grant select on public.business_deletion_cleanup to authenticated;
create policy "Admins read pending business cleanup" on public.business_deletion_cleanup
for select to authenticated using ((select public.is_admin()));

create function public.delete_business_permanently(p_business_id uuid, p_confirmation text)
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
    if not found then
      raise exception using errcode = 'P0002', message = 'BUSINESS_NOT_FOUND';
    end if;
    if p_confirmation is distinct from v_job.business_name then
      raise exception using errcode = '22023', message = 'CONFIRMATION_MISMATCH';
    end if;
    update public.business_deletion_cleanup set objects = (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
      from storage.objects where bucket_id in ('business-logos', 'business-payment-qrs')
        and split_part(name, '/', 1) = p_business_id::text
    ) where business_id = p_business_id returning * into v_job;
    return to_jsonb(v_job);
  end if;
  if p_confirmation is distinct from v_business.name then
    raise exception using errcode = '22023', message = 'CONFIRMATION_MISMATCH';
  end if;

  insert into public.business_deletion_cleanup(business_id, business_name, slug, objects)
  select v_business.id, v_business.name, v_business.slug,
    coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
  from storage.objects
  where bucket_id in ('business-logos', 'business-payment-qrs')
    and split_part(name, '/', 1) = p_business_id::text
  returning * into v_job;

  delete from public.analytics_events where business_id = p_business_id;
  delete from public.review_sessions where business_id = p_business_id;
  -- Generations cascade from sessions; question options cascade from questions.
  delete from public.subscriptions where business_id = p_business_id;
  delete from public.legacy_payment_destinations where business_id = p_business_id;
  delete from public.audit_logs where business_id = p_business_id;
  -- Questions, Smart Links, payment methods, and Smart Link events cascade.
  delete from public.businesses where id = p_business_id;
  return to_jsonb(v_job);
end;
$$;

create function public.complete_business_deletion(p_business_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  if exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'BUSINESS_STILL_EXISTS';
  end if;
  if exists (select 1 from storage.objects where bucket_id in ('business-logos', 'business-payment-qrs')
    and split_part(name, '/', 1) = p_business_id::text) then
    raise exception 'STORAGE_CLEANUP_PENDING';
  end if;
  delete from public.business_deletion_cleanup where business_id = p_business_id;
end;
$$;

revoke all on function public.delete_business_permanently(uuid, text) from public, anon;
revoke all on function public.complete_business_deletion(uuid) from public, anon;
grant execute on function public.delete_business_permanently(uuid, text) to authenticated;
grant execute on function public.complete_business_deletion(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
