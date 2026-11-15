// Cloudflare Pages Function: the AI assistant, served at  /api/chat  on your Pages address.
// All the logic lives in worker/src (the same code the Worker uses). Keys come from the Pages project's
// Settings → Variables and Secrets, never from this repo.
import { handle } from "../../worker/src/handler.js";

export async function onRequest(context) {
  return handle(context.request, context.env);
}
