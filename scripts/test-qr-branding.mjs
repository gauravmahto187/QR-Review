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
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}
const { resolveQrLogoPath } = load('src/lib/qr/logo-source.ts');
const { prepareQrLogo, renderQrPng, renderQrSvg } = load('src/lib/qr/render.ts');
const { buildBusinessReviewUrl } = load('src/lib/urls/business-review.ts');
for (const [businessLogo, customLogo, toggle, expected] of [
  ['business', null, false, null], ['business', null, true, 'business'],
  [null, 'custom', false, 'custom'], ['business', 'custom', false, 'custom'],
  ['business', 'custom', true, 'business'], [null, null, false, null],
  [null, 'custom', true, 'custom'], ['business', null, false, null],
  ['changed', 'custom', false, 'custom'], ['changed', 'custom', true, 'changed'],
]) assert.equal(resolveQrLogoPath({ logo_path: businessLogo, qr_logo_path: customLogo, use_business_logo_for_qr: toggle }), expected);

const fixtures = [
  ['square PNG', await sharp({ create: { width: 300, height: 300, channels: 3, background: '#163529' } }).png().toBuffer()],
  ['transparent PNG', await sharp(Buffer.from('<svg width="200" height="200"><circle cx="100" cy="100" r="80" fill="black"/></svg>')).png().toBuffer()],
  ['wide logo', await sharp({ create: { width: 1000, height: 100, channels: 3, background: '#144a33' } }).png().toBuffer()],
  ['JPEG', await sharp({ create: { width: 200, height: 300, channels: 3, background: '#884411' } }).jpeg().toBuffer()],
  ['WebP', await sharp({ create: { width: 300, height: 200, channels: 3, background: '#332299' } }).webp().toBuffer()],
  ['missing', null], ['broken', Buffer.from('not an image')],
  ['very small', await sharp({ create: { width: 1, height: 1, channels: 3, background: 'black' } }).png().toBuffer()],
  ['unsupported HEIC', Buffer.from('invalid heic')],
];
let scans = 0;
for (const slug of ['cafe', 'a'.repeat(80)]) {
  const url = buildBusinessReviewUrl(slug, 'https://boostup.example');
  for (const [name, bytes] of fixtures) {
    const logo = bytes ? await prepareQrLogo(bytes) : null;
    if (['missing', 'broken', 'unsupported HEIC'].includes(name)) assert.equal(logo, null);
    else assert.ok(logo, name);
    const png = await renderQrPng(url, logo);
    const svg = await renderQrSvg(url, logo);
    assert.equal(svg.includes('data:image/png;base64,'), Boolean(logo));
    for (const [format, rendered] of [['png', png], ['svg', Buffer.from(svg)]]) {
      const { data, info } = await sharp(rendered).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (format === 'png') assert.equal(info.width, 1600);
      assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, url, `${slug}: ${name} ${format}`);
      scans++;
    }
  }
}
const { loadQrLogo } = load('src/server/services/qr-code.ts');
const business = { id: 'business', logo_path: null, qr_logo_path: 'https://bad.example/logo', use_business_logo_for_qr: false };
assert.equal(await loadQrLogo({}, business), null);
assert.equal(await loadQrLogo({ storage: { from: () => ({ download: async () => ({ error: new Error('missing') }) }) } }, { ...business, qr_logo_path: 'business/missing.png' }), null);

// Exercise actual create/edit actions with a session-scoped database/storage double.
let saved;
let current;
let uploads = 0;
let removed = [];
const client = { from: (table) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: current, error: null }) }) }),
  insert: (value) => { if (table === 'audit_logs') return Promise.resolve({ error: null }); saved = value; return { select: () => ({ single: async () => ({ data: { id: value.id }, error: null }) }) }; },
  update: (value) => { saved = value; return { eq: async () => ({ error: null }) }; },
}) };
const mocks = {
  '@/lib/auth/admin': { requireAdmin: async () => ({ auth_user_id: 'admin' }) },
  '@/lib/supabase/server': { createServerSupabaseClient: async () => client },
  '@/features/businesses/storage': { uploadBusinessLogo: async () => `business/upload-${++uploads}.png`, removeBusinessLogo: async (_client, object) => { removed.push(object); } },
  'next/cache': { revalidatePath: () => {} },
  'next/navigation': { redirect: () => { throw new Error('REDIRECT'); } },
};
const actions = load('src/features/businesses/actions.ts', mocks);
function form(toggle = false, custom = false) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ description: '', primaryColor: '', name: 'Cafe', slug: 'cafe', status: 'ACTIVE', googleReviewUrl: 'https://www.google.com/maps/place/cafe' })) data.set(key, value);
  if (toggle) data.set('useBusinessLogoForQr', 'on');
  if (custom) data.set('qrLogo', new File([fixtures[0][1]], 'logo.png', { type: 'image/png' }));
  return data;
}
await assert.rejects(actions.createBusinessAction({}, form()), /REDIRECT/);
assert.equal(saved.qr_logo_path, null); assert.equal(saved.use_business_logo_for_qr, false);
await assert.rejects(actions.createBusinessAction({}, form(true, true)), /REDIRECT/);
assert.ok(saved.qr_logo_path); assert.equal(saved.use_business_logo_for_qr, true);
current = { id: 'bbf502ad-2a4e-4b2f-8a83-e0c28319ac82', slug: 'permanent', logo_path: 'business/main.png', qr_logo_path: 'business/custom.png', use_business_logo_for_qr: false, google_review_url: 'https://www.google.com/maps/place/cafe' };
await assert.rejects(actions.updateBusinessAction(current.id, {}, form(true, true)), /REDIRECT/);
assert.equal(saved.logo_path, current.logo_path); assert.ok(saved.qr_logo_path); assert.equal(saved.use_business_logo_for_qr, true); assert.equal(saved.slug, undefined);
assert.ok(removed.includes(current.qr_logo_path));
const removal = form(); removal.set('removeQrLogo', 'on');
await assert.rejects(actions.updateBusinessAction(current.id, {}, removal), /REDIRECT/);
assert.equal(saved.qr_logo_path, null);
const invalid = form(); invalid.set('qrLogo', new File(['bad'], 'logo.svg', { type: 'image/svg+xml' }));
assert.ok((await actions.createBusinessAction({}, invalid)).fieldErrors.qrLogo);
const oversized = form(); oversized.set('qrLogo', new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', { type: 'image/png' }));
assert.ok((await actions.updateBusinessAction(current.id, {}, oversized)).fieldErrors.qrLogo);
console.log(`Passed source priority A–H, ${scans} PNG/SVG decodes, storage fallback, create/edit/remove, immutable slug, MIME and size validation.`);
// The real download handler must reject anonymous callers before resolving a business.
let authorized = false;
let lookedUp = false;
const route = load('src/app/api/admin/businesses/[id]/qr/route.ts', {
  '@/lib/auth/admin': { getAdminAuthState: async () => ({ admin: authorized ? { id: 'admin' } : null }) },
  '@/lib/env/server': { serverEnv: { NEXT_PUBLIC_APP_URL: 'https://boostup.example' } },
  '@/features/businesses/queries': { getBusinessById: async () => { lookedUp = true; return { business: { ...current, qr_logo_path: null, logo_path: null, status: 'SUSPENDED' }, supabase: {} }; } },
});
const params = { params: Promise.resolve({ id: current.id }) };
assert.equal((await route.GET(new Request('https://boostup.example/api/qr'), params)).status, 401);
assert.equal(lookedUp, false);
authorized = true;
const response = await route.GET(new Request('https://boostup.example/api/qr?format=png&url=https://evil.example&logo=https://evil.example/logo.png'), params);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
const downloaded = await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(jsQR(new Uint8ClampedArray(downloaded.data), downloaded.info.width, downloaded.info.height)?.data, 'https://boostup.example/r/permanent');
console.log('Passed anonymous download rejection, protected suspended-business download, and ignored arbitrary URL/logo parameters.');

