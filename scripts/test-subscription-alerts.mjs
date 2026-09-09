import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";

const now = new Date("2026-09-09T18:14:00Z"); // 23:59 in Nepal
const day = 86400000;
const rows = [
  ["past", -1, "ACTIVE"], ["now", 0, "ACTIVE"],
  ["today", 30000, "TRIAL"], ["midnight", 60000, "ACTIVE"],
  ["seven", 7 * day, "ACTIVE"], ["after-seven", 7 * day + 1, "ACTIVE"],
  ["fifteen", 15 * day, "ACTIVE"], ["after-fifteen", 15 * day + 1, "TRIAL"],
  ["thirty", 30 * day, "ACTIVE"], ["later", 30 * day + 1, "ACTIVE"],
  ["suspended", 30000, "SUSPENDED"], ["cancelled", 30000, "CANCELLED"],
  ["marked-expired", day, "EXPIRED"], ["old-suspended", -day, "SUSPENDED"],
].map(([business_id, offset, status]) => ({ business_id, expires_at: new Date(+now + offset).toISOString(), status, is_current: true }));
rows.push({ ...rows[2], business_id: "historical", is_current: false });
let rpcError = { code: "PGRST202" };
let tableError = null;
let tableCalls = 0;
let authorized = true;
const client = {
  async rpc() { return { error: rpcError, data: { items: [], total: 42 } }; },
  from(table) {
    tableCalls++;
    let data = table === "subscriptions" ? [...rows] : rows.map(row => ({ id: row.business_id, name: row.business_id }));
    let start = 0, end = Infinity;
    const query = {
      select() { return this; },
      eq(key, value) { data = data.filter(row => row[key] === value); return this; },
      in(key, values) { data = data.filter(row => values.includes(row[key])); return this; },
      gt(key, value) { data = data.filter(row => row[key] > value); return this; },
      gte(key, value) { data = data.filter(row => row[key] >= value); return this; },
      lt(key, value) { data = data.filter(row => row[key] < value); return this; },
      lte(key, value) { data = data.filter(row => row[key] <= value); return this; },
      or(filter) {
        const timestamp = filter.split("expires_at.lte.")[1];
        data = data.filter(row => row.status === "EXPIRED" || row.expires_at <= timestamp);
        return this;
      },
      order() { return this; },
      range(a, b) { start = a; end = b; return this; },
      then(resolve) { return Promise.resolve({ data: data.slice(start, end + 1), count: data.length, error: tableError }).then(resolve); },
    };
    return query;
  },
};
const source = ts.transpileModule(readFileSync("src/features/subscriptions/queries.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiled = { exports: {} };
new Function("require", "module", "exports", "Date", source)(name => {
  if (name === "zod") return { z };
  if (name === "@/lib/supabase/server") return { createServerSupabaseClient: async () => client };
  if (name === "@/lib/auth/admin") return { requireAdmin: async () => { if (!authorized) throw new Error("Unauthorized"); } };
  return {};
}, compiled, compiled.exports, class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } });
const { getSubscriptionAlerts } = compiled.exports;
for (const [bucket, expected] of Object.entries({
  expired: ["past", "now", "marked-expired", "old-suspended"],
  today: ["today"], "7-days": ["midnight", "seven"],
  "15-days": ["after-seven", "fifteen"], "30-days": ["after-fifteen", "thirty"],
})) {
  const result = await getSubscriptionAlerts(bucket);
  assert.deepEqual(result.items.map(item => item.business_id), expected);
  assert.equal(result.total, expected.length);
}
assert.deepEqual((await getSubscriptionAlerts("7-days", 2, 1)).items.map(item => item.business_id), ["seven"]);
assert.deepEqual(await getSubscriptionAlerts("7-days", 3, 1), { items: [], total: 2 });
rpcError = null;
tableCalls = 0;
assert.equal((await getSubscriptionAlerts("today")).total, 42);
assert.equal(tableCalls, 0);
rpcError = { code: "42501" };
await assert.rejects(getSubscriptionAlerts("today"), /Unable to load/);
assert.equal(tableCalls, 0);
rpcError = { code: "PGRST202" };
tableError = { code: "08006" };
await assert.rejects(getSubscriptionAlerts("today"), /Unable to load/);
authorized = false;
await assert.rejects(getSubscriptionAlerts("today"), /Unauthorized/);
console.log("Subscription alerts: Nepal midnight, all bucket boundaries, status/history filtering, exact pagination, RPC success, and error/access handling passed.");
