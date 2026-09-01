set lock_timeout = '10s';
set statement_timeout = '2min';

create or replace function public.apply_subscription_action(
  p_business_id uuid,
  p_action text,
  p_months integer default null,
  p_custom_expires_at timestamptz default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_current public.subscriptions%rowtype;
  v_previous_status public.subscription_status;
  v_new_id uuid := gen_random_uuid();
  v_plan text;
  v_status public.subscription_status;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_suspended_at timestamptz;
  v_cancelled_at timestamptz;
  v_audit_action text;
  v_metadata jsonb := '{}'::jsonb;
  v_has_valid_current boolean := false;
begin
  if v_admin_user_id is null or not public.is_admin() then
    raise exception 'Administrator authorization required.' using errcode = '42501';
  end if;

  perform 1 from public.businesses where id = p_business_id for update;
  if not found then
    raise exception 'Business not found.' using errcode = 'P0002';
  end if;

  select * into v_current
  from public.subscriptions
  where business_id = p_business_id and is_current
  for update;

  if found then
    v_has_valid_current :=
      v_current.status in ('TRIAL', 'ACTIVE') and v_current.expires_at > v_now;
  end if;

  if p_action = 'START_TRIAL' then
    if exists (select 1 from public.subscriptions where business_id = p_business_id) then
      raise exception 'A trial can only be started before any subscription history exists.' using errcode = '22023';
    end if;

    v_plan := '7-day trial';
    v_status := 'TRIAL';
    v_starts_at := v_now;
    v_expires_at := v_now + interval '7 days';
    v_audit_action := 'SUBSCRIPTION_TRIAL_STARTED';
  elsif p_action = 'ACTIVATE_MONTHS' then
    if p_months not in (1, 3, 6, 12) then
      raise exception 'Subscription duration must be 1, 3, 6, or 12 months.' using errcode = '22023';
    end if;

    v_plan := case p_months
      when 1 then '1 month'
      when 3 then '3 months'
      when 6 then '6 months'
      when 12 then '1 year'
    end;
    v_status := 'ACTIVE';
    v_starts_at := v_now;
    v_expires_at := (case when v_has_valid_current then v_current.expires_at else v_now end)
      + make_interval(months => p_months);
    v_audit_action := case
      when v_has_valid_current then 'SUBSCRIPTION_EXTENDED'
      else 'SUBSCRIPTION_ACTIVATED'
    end;
    v_metadata := jsonb_build_object(
      'months', p_months,
      'extended_from_existing_expiry', v_has_valid_current
    );
  elsif p_action = 'SET_CUSTOM_EXPIRY' then
    if p_custom_expires_at is null or p_custom_expires_at <= v_now then
      raise exception 'Custom expiry must be in the future.' using errcode = '22023';
    end if;

    v_plan := 'Custom expiry';
    v_status := 'ACTIVE';
    v_starts_at := v_now;
    v_expires_at := p_custom_expires_at;
    v_audit_action := 'SUBSCRIPTION_CUSTOM_EXPIRY_SET';
    v_metadata := jsonb_build_object('custom_expires_at', p_custom_expires_at);
  elsif p_action = 'SUSPEND' then
    if v_current.id is null or v_current.status not in ('TRIAL', 'ACTIVE') or v_current.expires_at <= v_now then
      raise exception 'Only a currently valid trial or active subscription can be suspended.' using errcode = '22023';
    end if;

    v_plan := v_current.plan;
    v_status := 'SUSPENDED';
    v_starts_at := v_current.starts_at;
    v_expires_at := v_current.expires_at;
    v_suspended_at := v_now;
    v_audit_action := 'SUBSCRIPTION_SUSPENDED';
  elsif p_action = 'REACTIVATE' then
    if v_current.id is null or v_current.status <> 'SUSPENDED' or v_current.expires_at <= v_now then
      raise exception 'Only a suspended, unexpired subscription can be reactivated.' using errcode = '22023';
    end if;

    select status into v_previous_status
    from public.subscriptions
    where business_id = p_business_id
      and id <> v_current.id
      and status in ('TRIAL', 'ACTIVE')
    order by created_at desc
    limit 1;

    v_plan := v_current.plan;
    v_status := case when v_previous_status = 'TRIAL' then 'TRIAL'::public.subscription_status else 'ACTIVE'::public.subscription_status end;
    v_starts_at := v_current.starts_at;
    v_expires_at := v_current.expires_at;
    v_audit_action := 'SUBSCRIPTION_REACTIVATED';
  elsif p_action = 'CANCEL' then
    if v_current.id is null or v_current.status = 'CANCELLED' then
      raise exception 'There is no cancellable current subscription.' using errcode = '22023';
    end if;

    v_plan := v_current.plan;
    v_status := 'CANCELLED';
    v_starts_at := v_current.starts_at;
    v_expires_at := v_current.expires_at;
    v_cancelled_at := v_now;
    v_audit_action := 'SUBSCRIPTION_CANCELLED';
  else
    raise exception 'Unsupported subscription action.' using errcode = '22023';
  end if;

  if v_current.id is not null then
    update public.subscriptions set is_current = false where id = v_current.id;
    v_metadata := v_metadata || jsonb_build_object(
      'previous_subscription_id', v_current.id,
      'previous_expires_at', v_current.expires_at
    );
  end if;

  insert into public.subscriptions (
    id, business_id, plan, status, starts_at, expires_at, is_current,
    suspended_at, cancelled_at
  ) values (
    v_new_id, p_business_id, v_plan, v_status, v_starts_at, v_expires_at, true,
    v_suspended_at, v_cancelled_at
  );

  insert into public.audit_logs (
    admin_user_id, business_id, action, entity_type, entity_id, metadata
  ) values (
    v_admin_user_id, p_business_id, v_audit_action, 'subscription', v_new_id,
    v_metadata || jsonb_build_object(
      'plan', v_plan,
      'status', v_status,
      'starts_at', v_starts_at,
      'expires_at', v_expires_at
    )
  );

  return v_new_id;
end;
$$;

revoke all on function public.apply_subscription_action(uuid, text, integer, timestamptz) from public;
grant execute on function public.apply_subscription_action(uuid, text, integer, timestamptz) to authenticated, service_role;
