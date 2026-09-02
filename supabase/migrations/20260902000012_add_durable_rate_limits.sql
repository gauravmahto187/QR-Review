set lock_timeout = '10s';
set statement_timeout = '2min';

create table public.rate_limit_counters (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 1,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (scope, key_hash),
  constraint rate_limit_scope_length check (char_length(scope) between 1 and 80),
  constraint rate_limit_key_hash_format check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint rate_limit_request_count_positive check (request_count > 0)
);

alter table public.rate_limit_counters enable row level security;
revoke all on table public.rate_limit_counters from anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_counters to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service authorization required.' using errcode = '42501';
  end if;
  if char_length(p_scope) not between 1 and 80
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit not between 1 and 10000
    or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters.' using errcode = '22023';
  end if;

  insert into public.rate_limit_counters as counters (
    scope, key_hash, window_started_at, request_count, updated_at
  ) values (
    p_scope, p_key_hash, v_now, 1, v_now
  )
  on conflict (scope, key_hash) do update
    set window_started_at = case
          when counters.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
          else counters.window_started_at
        end,
        request_count = case
          when counters.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
          else counters.request_count + 1
        end,
        updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

comment on table public.rate_limit_counters is
  'Durable server-side abuse counters. key_hash values are HMAC digests; raw network and session identifiers are never stored.';

