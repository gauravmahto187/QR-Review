import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
function load(relative, mocks = {}) {
  const filename = path.resolve(relative);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  const localRequire = name => {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}
const { preparePaymentImage, validPaymentPath } = load('src/features/smart-links/payment-images.ts');
const { normalizeSmartLink } = load('src/features/smart-links/config.ts');
const businessId = 'bbf502ad-2a4e-4b2f-8a83-e0c28319ac82';
const id = 'abf502ad-2a4e-4b2f-8a83-e0c28319ac82';
const bytes = await sharp({ create: { width: 320, height: 480, channels: 3, background: 'white' } }).png().toBuffer();
for (const [mime, format] of [['image/png','png'],['image/jpeg','jpeg'],['image/webp','webp']]) {
  const result = await preparePaymentImage(new File([await sharp(bytes)[format]().toBuffer()], `qr.${format}`, { type: mime }));
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width,320); assert.equal(metadata.height,480); assert.equal(metadata.format,'png');
}
for (const file of [new File(['bad'],'bad.png',{type:'image/png'}), new File([bytes],'qr.svg',{type:'image/svg+xml'}), new File([bytes],'qr.jpg',{type:'image/jpeg'}), new File([new Uint8Array(2097153)],'big.png',{type:'image/png'}), new File([],'empty.png',{type:'image/png'})]) await assert.rejects(preparePaymentImage(file));
assert.equal(validPaymentPath(`${businessId}/${id}/${id}.png`,businessId,id),true);
assert.equal(validPaymentPath(`${businessId}/esewa/${id}.png`,businessId,id),true);
for(const bad of [`${id}/${id}/${id}.png`,`${businessId}/${businessId}/${id}.png`,`${businessId}/../${id}.png`,'https://evil.example/qr.png']) assert.equal(validPaymentPath(bad,businessId,id),false);
assert.equal(normalizeSmartLink('ESEWA','https://esewa.com.np'),null);
let current = null;
let saved;
let fail=false;
let admin=true;
const removed=[];
const uploaded=[];
const client={
  from(){const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},maybeSingle:async()=>({data:current && filters.business_id===current.business_id && filters.id===current.id?current:null,error:null})};return q;},
  storage:{from:()=>({upload:async path=>{uploaded.push(path);return {error:null};},remove:async paths=>{removed.push(...paths);return {error:null};}})},
  rpc:async(_name,args)=>{saved=args;return {error:fail?{code:'23505'}:null};},
};
const {mutatePaymentQr}=load('src/features/smart-links/payment-actions.ts',{
  '@/lib/auth/admin':{requireAdmin:async()=>{if(!admin)throw new Error('Unauthorized');}},
  '@/lib/supabase/server':{createServerSupabaseClient:async()=>client},
  'next/cache':{revalidatePath(){}},
});
function form(name, action='CREATE', image=true) {
  const f=new FormData();for(const [k,v]of Object.entries({name,action,id:current?.id??id,isActive:'on'}))f.set(k,v);
  if(image)f.set('image',new File([bytes],'qr.png',{type:'image/png'}));return f;
}
for(const name of ['eSewa','Khalti','Fonepay','Global IME Bank','Any custom provider']) {
  assert.deepEqual(await mutatePaymentQr(businessId,form(name)),{});
  assert.equal(saved.p_name,name);assert.equal(saved.p_url,undefined);
  assert.ok(validPaymentPath(saved.p_image_path,businessId,saved.p_payment_id));
  assert.ok(!saved.p_image_path.includes(name));
  current={id:saved.p_payment_id,business_id:businessId,name,image_path:saved.p_image_path};
  const old=current.image_path;
  assert.deepEqual(await mutatePaymentQr(businessId,form(name+' edited','UPDATE')),{});
  assert.notEqual(saved.p_image_path,old);assert.ok(removed.includes(old));current.image_path=saved.p_image_path;
  const disable=form(name,'UPDATE',false);disable.delete('isActive');
  assert.deepEqual(await mutatePaymentQr(businessId,disable),{});assert.equal(saved.p_is_active,false);
  const move=form(name,'MOVE',false);move.set('direction','UP');
  assert.deepEqual(await mutatePaymentQr(businessId,move),{});assert.equal(saved.p_direction,'UP');
  assert.deepEqual(await mutatePaymentQr(businessId,form(name,'DELETE',false)),{});assert.ok(removed.includes(current.image_path));
}
assert.ok((await mutatePaymentQr(businessId,form('Missing image','CREATE',false))).error);
const inject=form('Path injection','CREATE',false);inject.set('image_path',`${businessId}/${id}/${id}.png`);
assert.ok((await mutatePaymentQr(businessId,inject)).error);
assert.ok((await mutatePaymentQr(id,form('Cross business','UPDATE'))).error);
fail=true;assert.ok((await mutatePaymentQr(businessId,form('Rollback'))).error);assert.ok(removed.includes(uploaded.at(-1)));fail=false;
admin=false;await assert.rejects(mutatePaymentQr(businessId,form('Denied')),/Unauthorized/);

const events=[];
const {recordPaymentEvent}=load('src/server/services/smart-links.ts',{
  '@/lib/supabase/privileged':{createPrivilegedSupabaseClient:()=>({from:()=>({insert:async event=>{events.push(event);return {error:null};}})})},
});
let available=true;
let active=true;
let name='Global IME Bank';
const resolveSmartLinks=async()=>available?{business:{id:businessId},links:[],payments:active?[{id,name,image_path:`${businessId}/${id}/${id}.png`}]:[],supabase:{storage:{from:()=>({download:async()=>({data:new Blob([bytes]),error:null})})}}}:null;
const mocks={
  '@/server/services/smart-links':{resolveSmartLinks,recordPaymentEvent},
  '@/lib/security/origin':{hasTrustedMutationOrigin:()=>true},
  '@/lib/security/rate-limit':{checkPublicRateLimit:async()=>({allowed:true})},
};
const route=load('src/app/api/public/smart/[slug]/route.ts',mocks);
const image=load('src/app/api/public/smart/[slug]/image/[id]/route.ts',mocks);
const params={params:Promise.resolve({slug:'cafe'})};
const request=body=>new Request('https://app.example/api',{method:'POST',body:JSON.stringify(body)});
assert.equal((await route.POST(request({event:'payment-page'}),params)).status,204);
assert.equal(events.at(-1).event_type,'PAYMENT_PAGE_VIEW');
for(name of ['eSewa','Khalti','Fonepay','Global IME Bank']) {
  const response=await route.POST(request({event:'payment-qr',paymentId:id}),params);
  const body=await response.json();assert.equal(body.kind,'payment-qr');assert.equal(body.name,name);assert.equal(body.url,undefined);
  assert.deepEqual(events.at(-1),{business_id:businessId,event_type:'PAYMENT_QR_VIEW',payment_method_id:id,link_type:null});
  const img=await image.GET(request({}),{params:Promise.resolve({slug:'cafe',id})});assert.equal(img.status,200);
}
assert.equal((await route.POST(request({event:'payment-qr',paymentId:businessId}),params)).status,404);
assert.equal((await route.POST(request({event:'payment-qr',paymentId:id,image_path:'evil'}),params)).status,400);
assert.equal((await route.POST(request({event:'click',linkId:id}),params)).status,404);
active=false;assert.equal((await image.GET(request({}),{params:Promise.resolve({slug:'cafe',id})})).status,404);
active=true;available=false;assert.equal((await image.GET(request({}),{params:Promise.resolve({slug:'cafe',id})})).status,404);
console.log('Passed generic names, required QR, MIME/size/decoding, create/replace/remove/disable/move dispatch, failed-save cleanup, cross-business/path denial, nested payment events, image responses, and disabled/business availability checks. Database calls use doubles.');
