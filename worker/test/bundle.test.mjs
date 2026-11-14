import test from "node:test"; import assert from "node:assert/strict";
import worker from "../assistant-worker.js";
test("the single pasted file works end to end (default export, global fetch)", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async (u, i) => {
    if (String(u).includes("anthropic")) { const b = JSON.parse(i.body); if (b.messages.length === 1) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "a", name: "calculate", input: { expression: "12*12" } }] }); return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "144" }] }); }
    throw new Error("unexpected " + u);
  };
  try {
    const r = await worker.fetch(new Request("https://w.test/", { method: "POST", headers: { Origin: "https://iceupdate.com", "CF-Connecting-IP": "11.1.1.1" }, body: JSON.stringify({ messages: [{ role: "user", content: "12*12" }] }) }), { ALLOWED_ORIGINS: "https://iceupdate.com", ANTHROPIC_API_KEY: "sk-ant-x1234567" });
    assert.equal(r.status, 200); assert.equal((await r.json()).reply, "144");
    const c = await worker.fetch(new Request("https://w.test/", { method: "POST", headers: { Origin: "https://iceupdate.com", "CF-Connecting-IP": "11.1.1.2" }, body: JSON.stringify({ messages: [{ role: "user", content: "/calculate 2^10" }] }) }), { ALLOWED_ORIGINS: "https://iceupdate.com", ANTHROPIC_API_KEY: "sk-ant-x1234567" });
    assert.match((await c.json()).reply, /1024/);
  } finally { globalThis.fetch = real; }
});
test("the pasted file has no eval / Function / secrets", async () => {
  const fs = await import("fs"); const s = fs.readFileSync(new URL("../assistant-worker.js", import.meta.url), "utf8");
  assert.doesNotMatch(s, /\beval\s*\(|new Function|Function\s*\(/); assert.doesNotMatch(s, /sk-[A-Za-z0-9]{20,}/);
});
