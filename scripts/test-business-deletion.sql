-- Run in a transaction and always roll back. Only generated fixture IDs are deleted.
begin;
create table public._business_deletion_test_blocker (
  business_id uuid references public.businesses(id) on delete restrict
);
do $$
declare
  v_id uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_question uuid := gen_random_uuid();
  v_session uuid := gen_random_uuid();
  v_payment uuid := gen_random_uuid();
  v_admin uuid;
  v_result jsonb;
begin
  select auth_user_id into v_admin from public.admin_profiles where role = 'ADMIN' limit 1;
  if v_admin is null then raise exception 'Test requires an existing admin profile'; end if;
  insert into public.businesses(id,name,slug,google_review_url,status,archived_at) values
    (v_id,'Deletion fixture', 'deletion-test-' || v_id, 'https://www.google.com/maps', 'ARCHIVED', now()),
    (v_other,'Keep fixture', 'keep-test-' || v_other, 'https://www.google.com/maps', 'ACTIVE', null);
  insert into public.subscriptions(business_id,plan,status,starts_at,expires_at) values (v_id,'Test','ACTIVE',now(),now()+interval '1 day');
  insert into public.review_questions(id,business_id,question,is_active) values(v_question,v_id,'Test question',false);
  insert into public.review_question_options(question_id,label,value) values(v_question,'Test','test');
  insert into public.review_sessions(id,business_id) values(v_session,v_id);
  insert into public.review_generations(session_id,business_id,provider,generated_text,generation_number,language) values(v_session,v_id,'test','Test review',1,'en');
  insert into public.analytics_events(business_id,session_id,event_type) values(v_id,v_session,'PAGE_VIEW');
  insert into public.business_smart_links(business_id,type,label,url,sort_order) values(v_id,'WEBSITE','','https://example.com',0);
  insert into public.business_payment_qrs(id,business_id,name,image_path,sort_order) values(v_payment,v_id,'Test',v_id || '/' || v_payment || '/' || gen_random_uuid() || '.png',0);
  insert into public.smart_link_events(business_id,event_type) values(v_id,'SMART_PAGE_VIEW');
  insert into public.legacy_payment_destinations(link_id,business_id,provider,destination) values(gen_random_uuid(),v_id,'ESEWA','https://example.com');
  insert into public.audit_logs(admin_user_id,business_id,action,entity_type) values(v_admin,v_id,'TEST','business');
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.delete_business_permanently(v_id,'Deletion fixture');
    raise exception 'Unauthorized deletion succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  begin
    perform public.delete_business_permanently(v_id,'Wrong name');
    raise exception 'Wrong confirmation succeeded';
  exception when invalid_parameter_value then null;
  end;
  insert into public._business_deletion_test_blocker values(v_id);
  begin
    perform public.delete_business_permanently(v_id,'Deletion fixture');
    raise exception 'Blocked deletion succeeded';
  exception when foreign_key_violation then null;
  end;
  if not exists(select 1 from public.review_sessions where id=v_session)
    or not exists(select 1 from public.subscriptions where business_id=v_id)
    or exists(select 1 from public.business_deletion_cleanup where business_id=v_id) then
    raise exception 'Deletion was not atomic';
  end if;
  delete from public._business_deletion_test_blocker where business_id=v_id;
  v_result := public.delete_business_permanently(v_id,'Deletion fixture');
  if exists(select 1 from public.businesses where id=v_id)
    or exists(select 1 from public.subscriptions where business_id=v_id)
    or exists(select 1 from public.review_sessions where business_id=v_id)
    or exists(select 1 from public.review_generations where business_id=v_id)
    or exists(select 1 from public.review_questions where business_id=v_id)
    or exists(select 1 from public.review_question_options where question_id=v_question)
    or exists(select 1 from public.analytics_events where business_id=v_id)
    or exists(select 1 from public.smart_link_events where business_id=v_id)
    or exists(select 1 from public.business_smart_links where business_id=v_id)
    or exists(select 1 from public.business_payment_qrs where business_id=v_id)
    or exists(select 1 from public.legacy_payment_destinations where business_id=v_id)
    or exists(select 1 from public.audit_logs where business_id=v_id) then
    raise exception 'Related business data remains';
  end if;
  if not exists(select 1 from public.businesses where id=v_other) then raise exception 'Unrelated business deleted'; end if;
  perform public.delete_business_permanently(v_id,'Deletion fixture'); -- idempotent cleanup retry
  perform public.complete_business_deletion(v_id);
  if exists(select 1 from public.business_deletion_cleanup where business_id=v_id) then raise exception 'Cleanup job remains'; end if;
  if has_function_privilege('anon','public.delete_business_permanently(uuid,text)','EXECUTE') then raise exception 'Anonymous execute allowed'; end if;
end;
$$;
select 'PASS: admin gate, confirmation, atomic rollback, archived deletion, all related data, business isolation, cleanup retry' as result;
rollback;
