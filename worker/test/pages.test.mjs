import test from "node:test"; import assert from "node:assert/strict";
import { onRequest } from "../../functions/api/chat.js";
test("Pages Function: status check, CORS preflight and origin lock", async () => {
  const env = { ANTHROPIC_API_KEY: "sk-ant-x1234567" };
  const g = await onRequest({ request: new Request("https://p.test/api/chat", { method: "GET", headers: { Origin: "https://iceupdate.com" } }), env });
  assert.equal(g.status, 200); assert.equal((await g.json()).ai, "anthropic");
  const o = await onRequest({ request: new Request("https://p.test/api/chat", { method: "OPTIONS", headers: { Origin: "https://iceupdate.com" } }), env });
  assert.equal(o.status, 204); assert.equal(o.headers.get("access-control-allow-origin"), "https://iceupdate.com");
  const bad = await onRequest({ request: new Request("https://p.test/api/chat", { method: "POST", headers: { Origin: "https://evil.test" }, body: "{}" }), env });
  assert.equal(bad.status, 403);
});
