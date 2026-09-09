-- Integration check against the linked database. All fixtures are rolled back.
begin;
do $$
begin
  if not exists(select 1 from public.admin_profiles where role='ADMIN') then raise exception 'An admin profile is required for this integration check.'; end if;
  perform set_config('request.jwt.claim.sub',(select auth_user_id::text from public.admin_profiles where role='ADMIN' limit 1),true);
  if has_table_privilege('anon','public.business_payment_qrs','SELECT') then raise exception 'Anonymous table access must be revoked.'; end if;
  if not (select relrowsecurity from pg_class where oid='public.business_payment_qrs'::regclass) then raise exception 'Payment RLS disabled.'; end if;
end;
$$;
set local role authenticated;
do $$
declare
 b uuid := gen_random_uuid();
 other_b uuid := gen_random_uuid();
 p uuid := gen_random_uuid();
 q uuid := gen_random_uuid();
 image text;
 replacement text;
 rejected boolean;
begin
 insert into public.businesses(id,name,slug,google_review_url,status)
 values(b,'Payment integration fixture','payment-test-'||b::text,'https://www.google.com/maps','ACTIVE');
 image := b::text||'/'||p::text||'/'||gen_random_uuid()::text||'.png';
 replacement := b::text||'/'||p::text||'/'||gen_random_uuid()::text||'.png';
 insert into storage.objects(bucket_id,name) values('business-payment-qrs',image),('business-payment-qrs',replacement),('business-payment-qrs',b::text||'/'||q::text||'/'||q::text||'.png');
 perform public.apply_payment_qr_action(b,'CREATE',p,'Global IME Bank',image,true);
 perform public.apply_payment_qr_action(b,'CREATE',q,'Custom Provider',b::text||'/'||q::text||'/'||q::text||'.png',true);
 perform public.apply_payment_qr_action(b,'MOVE',q,p_direction=>'UP');
 if (select sort_order from public.business_payment_qrs where id=q) <> 0 or (select sort_order from public.business_payment_qrs where id=p) <> 1 then raise exception 'Ordering failed.'; end if;
 perform public.apply_payment_qr_action(b,'UPDATE',p,'Renamed Provider',replacement,false);
 if not exists(select 1 from public.business_payment_qrs where id=p and image_path=replacement and not is_active and name='Renamed Provider') then raise exception 'Replacement/disable failed.'; end if;
 rejected := false;
 begin perform public.apply_payment_qr_action(other_b,'DELETE',p); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Cross-business mutation allowed.'; end if;
 rejected := false;
 begin perform public.apply_payment_qr_action(b,'UPDATE',p,'Invalid',b::text||'/'||q::text||'/'||q::text||'.png',true); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Arbitrary image path allowed.'; end if;
 rejected := false;
 begin perform public.apply_payment_qr_action(b,'CREATE',gen_random_uuid(),'No image',null,true); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Missing image allowed.'; end if;
 perform public.apply_payment_qr_action(b,'DELETE',p);
 if exists(select 1 from public.business_payment_qrs where id=p) then raise exception 'Removal failed.'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: admin CRUD, required image, ordering, cross-business/path denial, and RLS; fixtures rolled back' as result;
