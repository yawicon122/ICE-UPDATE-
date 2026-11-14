// Joins src/*.js into the ONE file you paste into Cloudflare: node worker/build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const order = ["guard", "calc", "indicators", "market", "memory", "tools", "providers", "handler"];
let out = "/* =====================================================================\n   ICE UPDATE — Website Assistant AI server (Cloudflare Worker) — GENERATED FILE\n   Edit worker/src/*.js, then run: node worker/build.mjs\n   Setup steps: worker/README.md\n   ===================================================================== */\n";
for (const n of order) {
  let s = fs.readFileSync(path.join(dir, "src", n + ".js"), "utf8");
  s = s.replace(/^import .*;\s*$/gm, "").replace(/^export (?!default)/gm, "");
  out += "\n" + s.trim() + "\n";
}
fs.writeFileSync(path.join(dir, "assistant-worker.js"), out);
console.log("assistant-worker.js", Math.round(out.length / 1024) + " KB");
