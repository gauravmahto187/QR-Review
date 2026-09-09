import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
import jsQR from 'jsqr';

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
const { normalizeSmartLink, SMART_LINK_TYPES } = load('src/features/smart-links/config.ts');
const destinations = {
  FACEBOOK: 'https://www.facebook.com/cafe', INSTAGRAM: 'https://instagram.com/cafe',
  TIKTOK: 'https://www.tiktok.com/@cafe', YOUTUBE: 'https://youtu.be/abc',
  WHATSAPP: 'https://wa.me/9779800000000', WEBSITE: 'https://example.com/',
  GOOGLE_MAPS: 'https://maps.app.goo.gl/cafe', PHONE: '+977 980-000-0000', EMAIL: 'hello@example.com',
  ESEWA: 'https://esewa.com.np/merchant/example', FONEPAY: 'https://fonepay.com/merchant/example',
};
for (const type of SMART_LINK_TYPES) {
  assert.ok(normalizeSmartLink(type, destinations[type]), type);
  for (const invalid of ['javascript:alert(1)', 'data:text/html,hi', 'http://example.com', 'https://good.com@evil.com', 'https://example.com\\@evil.com', 'https://example.com/%0aX', 'https:example.com', 'bad']) {
    assert.equal(normalizeSmartLink(type, invalid), null, `${type}: ${invalid}`);
  }
}
for (const [type, host] of [['FACEBOOK', 'facebook.com'], ['INSTAGRAM', 'instagram.com'], ['TIKTOK', 'tiktok.com'], ['YOUTUBE', 'youtube.com'], ['WHATSAPP', 'wa.me'], ['GOOGLE_MAPS', 'google.com'], ['ESEWA', 'esewa.com.np'], ['FONEPAY', 'fonepay.com']]) {
  for (const bad of [`https://${host}.evil.com/maps`, `https://fake${host}/maps`, `https://${host}:444/maps`, `https://user:password@${host}/maps`]) assert.equal(normalizeSmartLink(type, bad), null);
}
assert.equal(normalizeSmartLink('UNKNOWN', 'https://example.com'), null);
assert.equal(normalizeSmartLink('GOOGLE_MAPS', 'https://google.com/search?q=cafe'), null);
assert.equal(normalizeSmartLink('EMAIL', 'hello@example.com?bcc=evil@example.com'), null);
assert.equal(normalizeSmartLink('PHONE', 'tel:+9779800000000'), null);
assert.equal(normalizeSmartLink('EMAIL', 'mailto:hello@example.com'), null);
for (const type of ['WHATSAPP','GOOGLE_MAPS','PHONE','EMAIL','ESEWA','FONEPAY']) assert.equal(normalizeSmartLink(type, destinations[type]), null);

const businessId = 'bbf502ad-2a4e-4b2f-8a83-e0c28319ac82';
const linkId = 'abf502ad-2a4e-4b2f-8a83-e0c28319ac82';
let businessStatus = 'ACTIVE';

let active = true;
let destination = destinations.FACEBOOK;
const events = [];
const client = { from(table) {
  assert.notEqual(table, "subscriptions", "Smart Links must never query Review subscriptions");
  const filters = {};
  const query = {
    select() { return query; }, in(key, values) { assert.deepEqual(values, SMART_LINK_TYPES); return query; }, eq(key, value) { filters[key] = value; return query; },
    async maybeSingle() { return { error: null, data: table === 'businesses' ? { id: businessId, slug: 'cafe', status: businessStatus } : null }; },
    async order() { if (table === "business_payment_qrs") return { data: [], error: null }; assert.equal(filters.is_active, true); return { error: null, data: active ? [{ id: linkId, business_id: businessId, type: 'FACEBOOK', url: destination, is_active: true }] : [] }; },
    async insert(event) { events.push(event); return { error: null }; },
  };
  return query;
} };
const serviceMocks = { '@/lib/supabase/privileged': { createPrivilegedSupabaseClient: () => client }, '@/lib/observability/logger': { logger: { error() {} } } };
const service = load('src/server/services/smart-links.ts', serviceMocks);
assert.equal((await service.resolveSmartLinks('cafe')).links.length, 1);
active = false; assert.equal((await service.resolveSmartLinks('cafe')).links.length, 0); active = true;
destination = 'javascript:alert(1)'; assert.equal((await service.resolveSmartLinks('cafe')).links.length, 0); destination = destinations.FACEBOOK;
for (const status of ['SUSPENDED', 'ARCHIVED']) { businessStatus = status; assert.equal(await service.resolveSmartLinks('cafe'), null); }
businessStatus = 'ACTIVE';
const { evaluateBusinessAvailability } = load('src/server/services/business-availability.ts');
for (const subscription of [null, ...['EXPIRED','SUSPENDED','CANCELLED'].map(status=>({status,expires_at:'2099-01-01T00:00:00Z'})),{status:'ACTIVE',expires_at:'2020-01-01T00:00:00Z'}]) {
  assert.ok(await service.resolveSmartLinks('cafe'));
  assert.equal(evaluateBusinessAvailability('ACTIVE',subscription).valid,false);
}
assert.equal(evaluateBusinessAvailability('ACTIVE',{status:'ACTIVE',expires_at:'2099-01-01T00:00:00Z'}).valid,true);

let allowed = true;
let trusted = true;
const route = load('src/app/api/public/smart/[slug]/route.ts', {
  ...serviceMocks, '@/lib/security/origin': { hasTrustedMutationOrigin: () => trusted },
  '@/lib/security/rate-limit': { checkPublicRateLimit: async () => ({ allowed }) },
});
const request = body => new Request('https://boostup.example/api/public/smart/cafe', { method: 'POST', headers: { Origin: 'https://boostup.example' }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ slug: 'cafe' }) };
assert.equal((await route.POST(request({ event: 'view' }), params)).status, 204);
assert.deepEqual(events[0], { business_id: businessId, event_type: 'SMART_PAGE_VIEW', link_type: null });
const response = await route.POST(request({ event: 'click', linkId }), params);
assert.equal((await response.json()).url, destinations.FACEBOOK);
assert.deepEqual(events[1], { business_id: businessId, event_type: 'SMART_LINK_CLICK', link_type: 'FACEBOOK' });
for (const extra of [{ url: 'https://evil.example' }, { type: 'FONEPAY' }, { business_id: 'other' }]) assert.equal((await route.POST(request({ event: 'click', linkId, ...extra }), params)).status, 400);
allowed = false;
assert.equal((await route.POST(request({ event: 'click', linkId }), params)).status, 200);
assert.equal(events.length, 2);
trusted = false; assert.equal((await route.POST(request({ event: 'view' }), params)).status, 403); trusted = true;
active = false; assert.equal((await route.POST(request({ event: 'click', linkId }), params)).status, 404); active = true;
businessStatus = 'SUSPENDED'; assert.equal((await route.POST(request({ event: 'click', linkId }), params)).status, 404); businessStatus = 'ACTIVE';

let admin = true;
let mutation;
const actions = load('src/features/smart-links/actions.ts', {
  '@/lib/auth/admin': { requireAdmin: async () => { if (!admin) throw new Error('Unauthorized'); } },
  '@/lib/supabase/server': { createServerSupabaseClient: async () => ({ rpc: async (_name, args) => { mutation = args; return { error: null }; } }) },
  'next/cache': { revalidatePath() {} },
});
for (const type of SMART_LINK_TYPES) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ action: 'CREATE', type, label: '', url: destinations[type], isActive: 'on' })) form.set(key, value);
  assert.deepEqual(await actions.mutateSmartLink(businessId, form), {});
  assert.equal(mutation.p_url, normalizeSmartLink(type, destinations[type]));
  form.set('url', 'javascript:alert(1)'); assert.ok((await actions.mutateSmartLink(businessId, form)).error);
}
admin = false; await assert.rejects(actions.mutateSmartLink(businessId, new FormData()), /Unauthorized/);

const { buildBusinessSmartUrl, smartQrFilename } = load('src/lib/urls/business-smart.ts');
const { buildBusinessReviewUrl } = load('src/lib/urls/business-review.ts');
const { renderQrPng, renderQrSvg, prepareQrLogo } = load('src/lib/qr/render.ts');
const logo = await prepareQrLogo(await sharp({ create: { width: 200, height: 100, channels: 3, background: '#154733' } }).png().toBuffer());
let scans = 0;
for (const slug of ['cafe', 'a'.repeat(80)]) {
  for (const builder of [buildBusinessSmartUrl, buildBusinessReviewUrl]) {
    const url = builder(slug, 'https://boostup.example');
    assert.equal(url, `https://boostup.example/${builder === buildBusinessSmartUrl ? 's' : 'r'}/${slug}`);
    for (const brand of [null, logo]) for (const format of ['png', 'svg']) {
      const bytes = format === 'png' ? await renderQrPng(url, brand) : Buffer.from(await renderQrSvg(url, brand));
      const raw = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height)?.data, url);
      scans++;
    }
  }
}
assert.equal(smartQrFilename('cafe', 'png'), 'nexgen-cafe-smart-qr.png');
let qrAdmin = false;
const download = load('src/app/api/admin/businesses/[id]/smart-qr/route.ts', {
  '@/lib/auth/admin': { getAdminAuthState: async () => ({ admin: qrAdmin ? {} : null }) },
  '@/lib/env/server': { serverEnv: { NEXT_PUBLIC_APP_URL: 'https://boostup.example' } },
  '@/features/businesses/queries': { getBusinessById: async () => ({ business: { id: businessId, slug: 'cafe', qr_logo_path: null, logo_path: null }, supabase: {} }) },
});
const qrParams = { params: Promise.resolve({ id: businessId }) };
assert.equal((await download.GET(new Request('https://boostup.example/api/qr'), qrParams)).status, 401);
qrAdmin = true;
const qrResponse = await download.GET(new Request('https://boostup.example/api/qr?url=https://evil.example&format=png'), qrParams);
assert.equal(qrResponse.headers.get('content-disposition'), 'attachment; filename="nexgen-cafe-smart-qr.png"');
const qrRaw = await sharp(Buffer.from(await qrResponse.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(jsQR(new Uint8ClampedArray(qrRaw.data), qrRaw.info.width, qrRaw.info.height)?.data, 'https://boostup.example/s/cafe');
console.log(`Passed 5 supported types, retired-type rejection, independent Smart/Review availability, unsafe destination rejection, real service availability/filtering, route injection/analytics/rate-limit checks, admin validation/auth, ${scans + 1} QR decodes. Database operations use doubles; apply migration and verify RLS/atomic ordering on PostgreSQL separately.`);

