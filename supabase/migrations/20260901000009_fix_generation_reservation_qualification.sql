set lock_timeout = '10s';
set statement_timeout = '2min';

create or replace function public.reserve_review_generation(
  p_session_id uuid,
  p_business_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_hash text,
  p_language public.generation_language
)
returns table (generation_id uuid, generation_number smallint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.review_sessions%rowtype;
  v_number smallint;
  v_existing public.review_generations%rowtype;
begin
  select rs.* into v_session
  from public.review_sessions as rs
  where rs.id = p_session_id and rs.business_id = p_business_id
  for update;

  if not found or v_session.completed_at is null or v_session.expires_at is null or v_session.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'GENERATION_SESSION_INVALID';
  end if;
  if v_session.generation_language <> p_language then
    raise exception using errcode = 'P0001', message = 'GENERATION_LANGUAGE_INVALID';
  end if;

  select (count(*) + 1)::smallint into v_number
  from public.review_generations as rg
  where rg.session_id = p_session_id and rg.status = 'SUCCEEDED';

  if v_number > 2 then
    raise exception using errcode = 'P0001', message = 'GENERATION_LIMIT_REACHED';
  end if;

  select rg.* into v_existing
  from public.review_generations as rg
  where rg.session_id = p_session_id and rg.generation_number = v_number
  for update;

  if found then
    if v_existing.status = 'PENDING' and v_existing.last_attempted_at > now() - interval '30 seconds' then
      raise exception using errcode = 'P0001', message = 'GENERATION_IN_PROGRESS';
    end if;
    if v_existing.status = 'FAILED' and v_existing.last_attempted_at > now() - interval '10 seconds' then
      raise exception using errcode = 'P0001', message = 'GENERATION_RATE_LIMITED';
    end if;
    if v_existing.attempt_count >= 3 then
      raise exception using errcode = 'P0001', message = 'GENERATION_ATTEMPT_LIMIT_REACHED';
    end if;

    update public.review_generations as rg set
      provider = p_provider,
      model = p_model,
      prompt_version = p_prompt_version,
      input_hash = p_input_hash,
      language = p_language,
      status = 'PENDING',
      generated_text = null,
      error_code = null,
      attempt_count = rg.attempt_count + 1,
      last_attempted_at = now()
    where rg.id = v_existing.id;
    return query select v_existing.id, v_number;
    return;
  end if;

  return query
  insert into public.review_generations as rg (
    session_id, business_id, provider, model, prompt_version, input_hash,
    generation_number, language, status
  ) values (
    p_session_id, p_business_id, p_provider, p_model, p_prompt_version, p_input_hash,
    v_number, p_language, 'PENDING'
  )
  returning rg.id, rg.generation_number;
end;
$$;
