set lock_timeout = '10s';
set statement_timeout = '2min';

create or replace function public.get_platform_analytics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_from >= p_to or p_to - p_from > interval '367 days' then
    raise exception using errcode = '22023', message = 'INVALID_ANALYTICS_RANGE';
  end if;

  with
  event_counts as (
    select
      count(*) filter (where event_type = 'PAGE_VIEW')::int as page_views,
      count(*) filter (where event_type = 'REVIEW_STARTED')::int as review_starts,
      count(*) filter (where event_type = 'REVIEW_GENERATED')::int as reviews_generated,
      count(*) filter (where event_type = 'REVIEW_REGENERATED')::int as reviews_regenerated,
      count(*) filter (where event_type = 'GOOGLE_REVIEW_CLICK')::int as google_handoffs
    from public.analytics_events
    where created_at >= p_from and created_at < p_to
  ),
  business_counts as (
    select
      count(*)::int as total,
      count(*) filter (where status = 'ACTIVE')::int as active,
      count(*) filter (where status = 'SUSPENDED')::int as suspended,
      count(*) filter (where status = 'ARCHIVED')::int as archived
    from public.businesses
  ),
  current_subscriptions as (
    select s.*, b.name as business_name
    from public.subscriptions s
    join public.businesses b on b.id = s.business_id
    where s.is_current
  ),
  subscription_counts as (
    select
      count(*) filter (where status = 'EXPIRED' or expires_at <= now())::int as expired,
      count(*) filter (where status in ('TRIAL', 'ACTIVE') and expires_at > now() and (expires_at at time zone 'Asia/Kathmandu')::date = (now() at time zone 'Asia/Kathmandu')::date)::int as expires_today,
      count(*) filter (where status in ('TRIAL', 'ACTIVE') and expires_at > now() and (expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date and expires_at <= now() + interval '3 days')::int as within_3_days,
      count(*) filter (where status in ('TRIAL', 'ACTIVE') and expires_at > now() + interval '3 days' and expires_at <= now() + interval '7 days')::int as within_7_days,
      count(*) filter (where status in ('TRIAL', 'ACTIVE') and expires_at > now() + interval '7 days' and expires_at <= now() + interval '30 days')::int as within_30_days
    from current_subscriptions
  ),
  days as (
    select generate_series(
      (p_from at time zone 'Asia/Kathmandu')::date,
      ((p_to - interval '1 microsecond') at time zone 'Asia/Kathmandu')::date,
      interval '1 day'
    )::date as day
  ),
  daily as (
    select
      (created_at at time zone 'Asia/Kathmandu')::date as day,
      count(*) filter (where event_type = 'PAGE_VIEW')::int as page_views,
      count(*) filter (where event_type = 'REVIEW_STARTED')::int as review_starts,
      count(*) filter (where event_type = 'REVIEW_GENERATED')::int as reviews_generated,
      count(*) filter (where event_type = 'GOOGLE_REVIEW_CLICK')::int as google_handoffs
    from public.analytics_events
    where created_at >= p_from and created_at < p_to
    group by 1
  )
  select jsonb_build_object(
    'events', to_jsonb(ec),
    'businesses', to_jsonb(bc),
    'subscriptions', to_jsonb(sc),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
      'date', d.day,
      'pageViews', coalesce(x.page_views, 0),
      'reviewStarts', coalesce(x.review_starts, 0),
      'reviewsGenerated', coalesce(x.reviews_generated, 0),
      'googleHandoffs', coalesce(x.google_handoffs, 0)
    ) order by d.day) from days d left join daily x on x.day = d.day), '[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (
      select e.event_type, e.created_at, b.id as business_id, b.name as business_name
      from public.analytics_events e
      join public.businesses b on b.id = e.business_id
      where e.created_at >= p_from and e.created_at < p_to
        and e.event_type in ('REVIEW_GENERATED', 'REVIEW_REGENERATED', 'GOOGLE_REVIEW_CLICK')
      order by e.created_at desc
      limit 8
    ) a), '[]'::jsonb),
    'subscriptionAlerts', coalesce((select jsonb_agg(to_jsonb(a) order by a.expires_at) from (
      select business_id, business_name, expires_at, status,
        case
          when status = 'EXPIRED' or expires_at <= now() then 'EXPIRED'
          when (expires_at at time zone 'Asia/Kathmandu')::date = (now() at time zone 'Asia/Kathmandu')::date then 'TODAY'
          when expires_at <= now() + interval '3 days' then 'WITHIN_3_DAYS'
          when expires_at <= now() + interval '7 days' then 'WITHIN_7_DAYS'
          else 'WITHIN_30_DAYS'
        end as window
      from current_subscriptions
      where status = 'EXPIRED' or expires_at <= now()
        or (status in ('TRIAL', 'ACTIVE') and expires_at <= now() + interval '30 days')
      order by expires_at
      limit 12
    ) a), '[]'::jsonb)
  ) into v_result
  from event_counts ec cross join business_counts bc cross join subscription_counts sc;

  return v_result;
end;
$$;

create or replace function public.get_business_analytics(p_business_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_from >= p_to or p_to - p_from > interval '367 days' then
    raise exception using errcode = '22023', message = 'INVALID_ANALYTICS_RANGE';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception using errcode = 'P0002', message = 'BUSINESS_NOT_FOUND';
  end if;

  with
  event_counts as (
    select
      count(*) filter (where event_type = 'PAGE_VIEW')::int as page_views,
      count(*) filter (where event_type = 'REVIEW_STARTED')::int as review_starts,
      count(*) filter (where event_type = 'REVIEW_GENERATED')::int as reviews_generated,
      count(*) filter (where event_type = 'REVIEW_REGENERATED')::int as reviews_regenerated,
      count(*) filter (where event_type = 'GOOGLE_REVIEW_CLICK')::int as google_handoffs
    from public.analytics_events
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
  ),
  days as (
    select generate_series(
      (p_from at time zone 'Asia/Kathmandu')::date,
      ((p_to - interval '1 microsecond') at time zone 'Asia/Kathmandu')::date,
      interval '1 day'
    )::date as day
  ),
  daily as (
    select
      (created_at at time zone 'Asia/Kathmandu')::date as day,
      count(*) filter (where event_type = 'PAGE_VIEW')::int as page_views,
      count(*) filter (where event_type = 'REVIEW_STARTED')::int as review_starts,
      count(*) filter (where event_type = 'REVIEW_GENERATED')::int as reviews_generated,
      count(*) filter (where event_type = 'GOOGLE_REVIEW_CLICK')::int as google_handoffs
    from public.analytics_events
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
    group by 1
  )
  select jsonb_build_object(
    'events', to_jsonb(ec),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
      'date', d.day,
      'pageViews', coalesce(x.page_views, 0),
      'reviewStarts', coalesce(x.review_starts, 0),
      'reviewsGenerated', coalesce(x.reviews_generated, 0),
      'googleHandoffs', coalesce(x.google_handoffs, 0)
    ) order by d.day) from days d left join daily x on x.day = d.day), '[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (
      select event_type, created_at
      from public.analytics_events
      where business_id = p_business_id and created_at >= p_from and created_at < p_to
        and event_type in ('REVIEW_GENERATED', 'REVIEW_REGENERATED', 'GOOGLE_REVIEW_CLICK')
      order by created_at desc
      limit 8
    ) a), '[]'::jsonb)
  ) into v_result
  from event_counts ec;

  return v_result;
end;
$$;

revoke all on function public.get_platform_analytics(timestamptz, timestamptz) from public;
revoke all on function public.get_business_analytics(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_platform_analytics(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_business_analytics(uuid, timestamptz, timestamptz) to authenticated, service_role;
