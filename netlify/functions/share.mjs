// POST /api/share with a packed run (the ?r= string) -> {id}; the short link is /s/<id>.
import { getStore } from "@netlify/blobs";

const ABC = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newId() {
  const b = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(b, (x) => ABC[x % ABC.length]).join("");
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const r = (await req.text()).trim();
  if (!/^[A-Za-z0-9_-]{10,16000}$/.test(r)) return new Response("Bad share", { status: 400 });
  try {
    const d = JSON.parse(Buffer.from(r, "base64url").toString("utf8"));
    if (!d || !Array.isArray(d.r)) throw 0;
  } catch {
    return new Response("Bad share", { status: 400 });
  }
  const store = getStore("shares");
  let id = newId();
  while (await store.get(id)) id = newId();
  await store.set(id, r);
  return Response.json({ id });
};

export const config = { path: "/api/share" };
