// POST /api/uid -> {id}; hands out sequential player ids starting at 1.
import { getStore } from "@netlify/blobs";

// only the game's own pages may ask for an id (stops other sites from burning through numbers)
function sameOrigin(req) {
  const o = req.headers.get("origin");
  return !o || o === new URL(req.url).origin;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const store = getStore({ name: "players", consistency: "strong" });
  for (let i = 0; i < 20; i++) {
    const cur = await store.getWithMetadata("counter", { type: "text" });
    const id = (cur ? parseInt(cur.data, 10) || 0 : 0) + 1;
    const res = cur
      ? await store.set("counter", String(id), { onlyIfMatch: cur.etag })
      : await store.set("counter", String(id), { onlyIfNew: true });
    if (res && res.modified !== false) return Response.json({ id });
  }
  return new Response("Busy", { status: 503 });
};

export const config = { path: "/api/uid" };
