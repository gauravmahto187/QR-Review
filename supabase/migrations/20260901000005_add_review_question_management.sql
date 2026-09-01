set lock_timeout = '10s';
set statement_timeout = '2min';

alter table public.review_questions add column archived_at timestamptz;

with ranked as (
  select id, row_number() over (partition by business_id order by sort_order, created_at, id) - 1 as next_order
  from public.review_questions
)
update public.review_questions q set sort_order = ranked.next_order
from ranked where q.id = ranked.id;

with ranked as (
  select id, row_number() over (partition by question_id order by sort_order, created_at, id) - 1 as next_order
  from public.review_question_options
)
update public.review_question_options o set sort_order = ranked.next_order
from ranked where o.id = ranked.id;

create unique index review_questions_business_sort_unique_idx
  on public.review_questions (business_id, sort_order);
create unique index review_question_options_question_sort_unique_idx
  on public.review_question_options (question_id, sort_order);
create unique index review_question_options_question_value_ci_unique_idx
  on public.review_question_options (question_id, lower(value));

create or replace function public.apply_review_question_action(
  p_business_id uuid,
  p_action text,
  p_question_id uuid default null,
  p_question text default null,
  p_is_active boolean default null,
  p_direction text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_question public.review_questions%rowtype;
  v_target public.review_questions%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_max_order integer;
  v_active_count integer;
  v_active_options integer;
  v_audit_action text;
  v_default_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
begin
  if v_admin_user_id is null or not public.is_admin() then
    raise exception 'Administrator authorization required.' using errcode = '42501';
  end if;

  perform 1 from public.businesses where id = p_business_id for update;
  if not found then raise exception 'Business not found.' using errcode = 'P0002'; end if;

  if p_action = 'CREATE_DEFAULTS' then
    if exists (select 1 from public.review_questions where business_id = p_business_id and archived_at is null) then
      raise exception 'Defaults can only be created when no questions exist.' using errcode = '22023';
    end if;

    insert into public.review_questions (id, business_id, question, sort_order, is_active) values
      (v_default_ids[1], p_business_id, 'How was your overall experience?', 0, true),
      (v_default_ids[2], p_business_id, 'What did you like most?', 1, true),
      (v_default_ids[3], p_business_id, 'Would you recommend us?', 2, true);

    insert into public.review_question_options (question_id, label, value, sort_order, is_active) values
      (v_default_ids[1], 'Excellent', 'excellent', 0, true),
      (v_default_ids[1], 'Very Good', 'very-good', 1, true),
      (v_default_ids[1], 'Good', 'good', 2, true),
      (v_default_ids[2], 'Service', 'service', 0, true),
      (v_default_ids[2], 'Staff', 'staff', 1, true),
      (v_default_ids[2], 'Quality', 'quality', 2, true),
      (v_default_ids[2], 'Cleanliness', 'cleanliness', 3, true),
      (v_default_ids[2], 'Atmosphere', 'atmosphere', 4, true),
      (v_default_ids[3], 'Definitely', 'definitely', 0, true),
      (v_default_ids[3], 'Yes', 'yes', 1, true),
      (v_default_ids[3], 'Probably', 'probably', 2, true);

    insert into public.audit_logs (admin_user_id, business_id, action, entity_type, entity_id, metadata)
    values (v_admin_user_id, p_business_id, 'DEFAULT_REVIEW_QUESTIONS_CREATED', 'review_question_set', null, jsonb_build_object('question_count', 3));
    return v_default_ids[1];
  end if;

  if p_action = 'CREATE' then
    select coalesce(max(sort_order), -1) + 1 into v_max_order from public.review_questions where business_id = p_business_id;
    insert into public.review_questions (id, business_id, question, sort_order, is_active)
    values (v_new_id, p_business_id, p_question, v_max_order, false);
    v_audit_action := 'REVIEW_QUESTION_CREATED';
  else
    select * into v_question from public.review_questions
    where id = p_question_id and business_id = p_business_id and archived_at is null for update;
    if not found then raise exception 'Question not found.' using errcode = 'P0002'; end if;
    v_new_id := v_question.id;

    if p_action = 'UPDATE' then
      update public.review_questions set question = p_question where id = v_question.id;
      v_audit_action := 'REVIEW_QUESTION_UPDATED';
    elsif p_action = 'SET_ACTIVE' then
      if p_is_active then
        select count(*) into v_active_count from public.review_questions
        where business_id = p_business_id and is_active and archived_at is null and id <> v_question.id;
        if v_active_count >= 5 then raise exception 'A business can have at most 5 active questions.' using errcode = '22023'; end if;
        select count(*) into v_active_options from public.review_question_options where question_id = v_question.id and is_active;
        if v_active_options < 2 then raise exception 'An active question requires at least 2 active options.' using errcode = '22023'; end if;
      end if;
      update public.review_questions set is_active = p_is_active where id = v_question.id;
      v_audit_action := case when p_is_active then 'REVIEW_QUESTION_ENABLED' else 'REVIEW_QUESTION_DISABLED' end;
    elsif p_action = 'ARCHIVE' then
      update public.review_questions set is_active = false, archived_at = clock_timestamp() where id = v_question.id;
      v_audit_action := 'REVIEW_QUESTION_ARCHIVED';
    elsif p_action = 'MOVE' then
      if p_direction = 'UP' then
        select * into v_target from public.review_questions where business_id = p_business_id and archived_at is null and sort_order < v_question.sort_order order by sort_order desc limit 1 for update;
      elsif p_direction = 'DOWN' then
        select * into v_target from public.review_questions where business_id = p_business_id and archived_at is null and sort_order > v_question.sort_order order by sort_order limit 1 for update;
      else raise exception 'Invalid move direction.' using errcode = '22023'; end if;
      if v_target.id is null then return v_question.id; end if;
      select coalesce(max(sort_order), 0) + 1000 into v_max_order from public.review_questions where business_id = p_business_id;
      update public.review_questions set sort_order = v_max_order where id = v_question.id;
      update public.review_questions set sort_order = v_question.sort_order where id = v_target.id;
      update public.review_questions set sort_order = v_target.sort_order where id = v_question.id;
      v_audit_action := 'REVIEW_QUESTION_REORDERED';
    else raise exception 'Unsupported question action.' using errcode = '22023'; end if;
  end if;

  insert into public.audit_logs (admin_user_id, business_id, action, entity_type, entity_id, metadata)
  values (v_admin_user_id, p_business_id, v_audit_action, 'review_question', v_new_id, jsonb_build_object('action', p_action));
  return v_new_id;
end;
$$;

create or replace function public.apply_review_option_action(
  p_business_id uuid,
  p_question_id uuid,
  p_action text,
  p_option_id uuid default null,
  p_label text default null,
  p_value text default null,
  p_is_active boolean default null,
  p_direction text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_question public.review_questions%rowtype;
  v_option public.review_question_options%rowtype;
  v_target public.review_question_options%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_count integer;
  v_max_order integer;
  v_audit_action text;
begin
  if v_admin_user_id is null or not public.is_admin() then raise exception 'Administrator authorization required.' using errcode = '42501'; end if;
  perform 1 from public.businesses where id = p_business_id for update;
  if not found then raise exception 'Business not found.' using errcode = 'P0002'; end if;
  select * into v_question from public.review_questions where id = p_question_id and business_id = p_business_id and archived_at is null for update;
  if not found then raise exception 'Question not found.' using errcode = 'P0002'; end if;

  if p_action = 'CREATE' then
    select count(*), coalesce(max(sort_order), -1) + 1 into v_count, v_max_order from public.review_question_options where question_id = p_question_id;
    if v_count >= 6 then raise exception 'A question can have at most 6 options.' using errcode = '22023'; end if;
    if exists (select 1 from public.review_question_options where question_id = p_question_id and lower(value) = lower(p_value)) then raise exception 'Option values must be unique.' using errcode = '23505'; end if;
    insert into public.review_question_options (id, question_id, label, value, sort_order, is_active)
    values (v_new_id, p_question_id, p_label, p_value, v_max_order, p_is_active);
    v_audit_action := 'REVIEW_OPTION_CREATED';
  else
    select * into v_option from public.review_question_options where id = p_option_id and question_id = p_question_id for update;
    if not found then raise exception 'Option not found.' using errcode = 'P0002'; end if;
    v_new_id := v_option.id;
    if p_action = 'UPDATE' then
      if exists (select 1 from public.review_question_options where question_id = p_question_id and id <> v_option.id and lower(value) = lower(p_value)) then raise exception 'Option values must be unique.' using errcode = '23505'; end if;
      update public.review_question_options set label = p_label, value = p_value where id = v_option.id;
      v_audit_action := 'REVIEW_OPTION_UPDATED';
    elsif p_action = 'SET_ACTIVE' then
      if not p_is_active and v_question.is_active then
        select count(*) into v_count from public.review_question_options where question_id = p_question_id and is_active and id <> v_option.id;
        if v_count < 2 then raise exception 'An active question requires at least 2 active options.' using errcode = '22023'; end if;
      end if;
      update public.review_question_options set is_active = p_is_active where id = v_option.id;
      v_audit_action := case when p_is_active then 'REVIEW_OPTION_ENABLED' else 'REVIEW_OPTION_DISABLED' end;
    elsif p_action = 'MOVE' then
      if p_direction = 'UP' then
        select * into v_target from public.review_question_options where question_id = p_question_id and sort_order < v_option.sort_order order by sort_order desc limit 1 for update;
      elsif p_direction = 'DOWN' then
        select * into v_target from public.review_question_options where question_id = p_question_id and sort_order > v_option.sort_order order by sort_order limit 1 for update;
      else raise exception 'Invalid move direction.' using errcode = '22023'; end if;
      if v_target.id is null then return v_option.id; end if;
      select coalesce(max(sort_order), 0) + 1000 into v_max_order from public.review_question_options where question_id = p_question_id;
      update public.review_question_options set sort_order = v_max_order where id = v_option.id;
      update public.review_question_options set sort_order = v_option.sort_order where id = v_target.id;
      update public.review_question_options set sort_order = v_target.sort_order where id = v_option.id;
      v_audit_action := 'REVIEW_OPTION_REORDERED';
    else raise exception 'Unsupported option action.' using errcode = '22023'; end if;
  end if;

  insert into public.audit_logs (admin_user_id, business_id, action, entity_type, entity_id, metadata)
  values (v_admin_user_id, p_business_id, v_audit_action, 'review_option', v_new_id, jsonb_build_object('question_id', p_question_id, 'action', p_action));
  return v_new_id;
end;
$$;

revoke all on function public.apply_review_question_action(uuid, text, uuid, text, boolean, text) from public;
revoke all on function public.apply_review_option_action(uuid, uuid, text, uuid, text, text, boolean, text) from public;
grant execute on function public.apply_review_question_action(uuid, text, uuid, text, boolean, text) to authenticated, service_role;
grant execute on function public.apply_review_option_action(uuid, uuid, text, uuid, text, text, boolean, text) to authenticated, service_role;
