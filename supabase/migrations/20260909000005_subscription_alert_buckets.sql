set lock_timeout = '10s';
set statement_timeout = '2min';

alter function public.get_platform_analytics(timestamptz, timestamptz)
  rename to get_platform_analytics_legacy;

create or replace function public.get_platform_analytics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_subscriptions jsonb;
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_from >= p_to or p_to - p_from > interval '367 days' then
    raise exception using errcode = '22023', message = 'INVALID_ANALYTICS_RANGE';
  end if;

  v_result := public.get_platform_analytics_legacy(p_from, p_to);

  with current_subscriptions as (
    select status, expires_at
    from public.subscriptions
    where is_current
  )
  select to_jsonb(counts)
  into v_subscriptions
  from (
    select
      count(*) filter (where status = 'EXPIRED' or expires_at <= now())::int as expired,
      count(*) filter (
        where status in ('TRIAL', 'ACTIVE')
          and expires_at > now()
          and (expires_at at time zone 'Asia/Kathmandu')::date = (now() at time zone 'Asia/Kathmandu')::date
      )::int as expires_today,
      count(*) filter (
        where status in ('TRIAL', 'ACTIVE')
          and expires_at > now()
          and (expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and expires_at <= now() + interval '7 days'
      )::int as within_7_days,
      count(*) filter (
        where status in ('TRIAL', 'ACTIVE')
          and expires_at > now() + interval '7 days'
          and (expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and expires_at <= now() + interval '15 days'
      )::int as within_15_days,
      count(*) filter (
        where status in ('TRIAL', 'ACTIVE')
          and expires_at > now() + interval '15 days'
          and (expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and expires_at <= now() + interval '30 days'
      )::int as within_30_days
    from current_subscriptions
  ) counts;

  return v_result || jsonb_build_object(
    'subscriptions', v_subscriptions,
    'subscriptionAlerts', '[]'::jsonb
  );
end;
$$;

create or replace function public.get_subscription_alerts(p_bucket text)
returns table (
  business_id uuid,
  business_name text,
  expires_at timestamptz,
  status public.subscription_status
)
language sql
stable
security invoker
set search_path = ''
as $$
  with classified as (
    select
      s.business_id,
      b.name as business_name,
      s.expires_at,
      s.status,
      case
        when s.status = 'EXPIRED' or s.expires_at <= now() then 'expired'
        when s.status in ('TRIAL', 'ACTIVE')
          and s.expires_at > now()
          and (s.expires_at at time zone 'Asia/Kathmandu')::date = (now() at time zone 'Asia/Kathmandu')::date then 'today'
        when s.status in ('TRIAL', 'ACTIVE')
          and s.expires_at > now()
          and (s.expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and s.expires_at <= now() + interval '7 days' then '7-days'
        when s.status in ('TRIAL', 'ACTIVE')
          and s.expires_at > now() + interval '7 days'
          and (s.expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and s.expires_at <= now() + interval '15 days' then '15-days'
        when s.status in ('TRIAL', 'ACTIVE')
          and s.expires_at > now() + interval '15 days'
          and (s.expires_at at time zone 'Asia/Kathmandu')::date > (now() at time zone 'Asia/Kathmandu')::date
          and s.expires_at <= now() + interval '30 days' then '30-days'
        else null
      end as bucket
    from public.subscriptions s
    join public.businesses b on b.id = s.business_id
    where s.is_current
  )
  select business_id, business_name, expires_at, status
  from classified
  where bucket = p_bucket
  order by expires_at, business_name;
$$;

revoke all on function public.get_platform_analytics_legacy(timestamptz, timestamptz) from public;
revoke all on function public.get_platform_analytics(timestamptz, timestamptz) from public;
revoke all on function public.get_subscription_alerts(text) from public;
grant execute on function public.get_platform_analytics_legacy(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_platform_analytics(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_subscription_alerts(text) to authenticated, service_role;
