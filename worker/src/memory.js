/* ---------- memory: saved ONLY when the visitor types /remember; private to one browser id; needs a KV namespace ---------- */
const MAX_ITEMS = 30, MAX_LEN = 300;
const SECRET = /(password|passwd|passcode|pin code|api[\s_-]?key|secret|private key|seed phrase|cvv|iban|\bssn\b|token)|\b(?:\d[ -]?){13,19}\b/i;

export function makeMemory(kv) {
  const enabled = !!(kv && kv.get && kv.put && kv.delete);
  const k = id => "m:" + id, pk = id => "p:" + id;
  async function load(id) { try { const v = await kv.get(k(id)); const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  const save = (id, a) => kv.put(k(id), JSON.stringify(a));
  async function setPending(id, p) { await kv.put(pk(id), JSON.stringify(p), { expirationTtl: 300 }); }
  async function getPending(id) { try { const v = await kv.get(pk(id)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  async function notes(id) { if (!enabled || !id) return []; return (await load(id)).map(m => m.text); }

  /* returns a reply string if the message was a memory command, otherwise null */
  async function command(id, text) {
    const m = /^\/(remember|memories|memory|forget|clear)\b\s*(.*)$/is.exec(text.trim());
    if (!m) return null;
    const cmd = m[1].toLowerCase(), arg = m[2].trim();
    if (!enabled || !id) return "Long-term memory isn't switched on for this site yet, so I can't save anything. I only keep this chat in your own browser.";
    const list = await load(id);
    if (cmd === "remember") {
      if (!arg) return "Tell me what to remember, e.g. **/remember I risk 1% per trade**.";
      if (arg.length > MAX_LEN) return "That's too long to save. Please keep it under " + MAX_LEN + " characters.";
      if (SECRET.test(arg)) return "I won't save passwords, keys, card numbers or similar private details. Please leave those out.";
      if (list.length >= MAX_ITEMS) return "Memory is full (" + MAX_ITEMS + " notes). Use **/forget** to remove one first.";
      list.push({ text: arg, t: new Date().toISOString() }); await save(id, list);
      return "Saved: \"" + arg + "\". I only remember what you tell me to. Type **/memories** to see everything saved.";
    }
    if (cmd === "memories" || cmd === "memory") {
      if (!list.length) return "Nothing is saved yet. Save something with **/remember ...**. Chat history stays in this browser tab; long-term memory only holds what you ask me to save.";
      return "Saved notes:\n" + list.map((x, i) => (i + 1) + ". " + x.text).join("\n") + "\n\nRemove one with **/forget 2** or everything with **/clear** (I'll ask you to confirm).";
    }
    if (cmd === "forget") {
      const a = arg.toLowerCase();
      if (a === "yes" || a === "confirm") {
        const p = await getPending(id);
        if (!p || p.type !== "forget") return "There's nothing waiting to be deleted. Use **/forget 2** or **/forget word** first.";
        const gone = new Set(p.ids), left = list.filter(x => !gone.has(x.t + x.text));
        await save(id, left); await kv.delete(pk(id));
        return "Deleted " + (list.length - left.length) + " note" + (list.length - left.length === 1 ? "" : "s") + ".";
      }
      if (a === "no" || a === "cancel") { await kv.delete(pk(id)); return "OK, nothing was deleted."; }
      if (!arg) return "Tell me which note to forget: **/forget 2** (number from /memories) or **/forget word**.";
      let hits;
      if (/^\d+$/.test(arg)) { const n = parseInt(arg, 10); hits = n >= 1 && n <= list.length ? [list[n - 1]] : []; }
      else hits = list.filter(x => x.text.toLowerCase().includes(a));
      if (!hits.length) return "I couldn't find a matching note. Type **/memories** to see them.";
      await setPending(id, { type: "forget", ids: hits.map(x => x.t + x.text) });
      return "Delete " + hits.length + " note" + (hits.length === 1 ? "" : "s") + "?\n" + hits.map(x => "- " + x.text).join("\n") + "\n\nReply **/forget yes** to confirm or **/forget no** to cancel.";
    }
    if (cmd === "clear") {
      const a = arg.toLowerCase();
      if (a === "yes" || a === "confirm") {
        const p = await getPending(id);
        if (!p || p.type !== "clear") return "Nothing is waiting. Type **/clear** first.";
        await kv.delete(k(id)); await kv.delete(pk(id));
        return "Done. All saved notes were deleted.";
      }
      if (a === "no" || a === "cancel") { await kv.delete(pk(id)); return "OK, nothing was deleted."; }
      await setPending(id, { type: "clear" });
      return "This deletes all " + list.length + " saved note" + (list.length === 1 ? "" : "s") + ". Reply **/clear yes** to confirm or **/clear no** to cancel.";
    }
    return null;
  }
  return { enabled, notes, command };
}
