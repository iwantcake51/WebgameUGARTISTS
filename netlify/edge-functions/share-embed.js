import { getStore } from "@netlify/blobs";

// Adds Discord/iMessage/Twitter link-preview tags to shared score links (/s/<id> short links and long ?r=... links).
// The run data is packed in the link by shareLink() in UGNeekPeek.html.
const DIFFS = { easy: "Easy", normal: "Normal", hard: "Hard", extreme: "Extreme" };
const MODS = { blind: "My ears are trained +10%", peek: "Just a peek −25%", lives: "Extra life −50%", half: "1 second is too much anyways +30%", rand: "Anywhere but the beginning +15%", mc: "I want Minecraft +5%" };
const COLORS = { easy: "#39e08b", normal: "#8c5cff", hard: "#ff9a4a", extreme: "#ff466b" };

function decode(r) {
  let s = r.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
function unpackArt(a) {
  a = String(a || "");
  return /^\d[\w.\-\/]+$/.test(a) ? `https://is${a[0]}-ssl.mzstatic.com/image/thumb/${a.slice(1)}/400x400bb.jpg` : "";
}
// shown in the sharer's own timezone (tz = their getTimezoneOffset() in minutes)
function sharedAt(ms, tz) {
  const off = Number.isFinite(+tz) ? +tz : 0;
  const t = new Date(ms - off * 60000);
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getUTCMonth()];
  const h = t.getUTCHours(), m = String(t.getUTCMinutes()).padStart(2, "0");
  const zone = Number.isFinite(+tz) ? "UTC" + (off <= 0 ? "+" : "-") + Math.abs(off / 60) : "UTC";
  return `${mon} ${t.getUTCDate()}, ${t.getUTCFullYear()} at ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"} (${zone})`;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default async (request, context) => {
  const url = new URL(request.url);
  const short = url.pathname.match(/^\/s\/([A-Za-z0-9]{4,16})\/?$/);
  let r = url.searchParams.get("r"), res;
  if (short) {
    r = await getStore("shares").get(short[1]);
    if (!r) return Response.redirect(new URL("/", url), 302);
    res = await fetch(new URL("/UGNeekPeek.html", url));
  } else {
    if (!r) return;
    res = await context.next();
  }
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;

  let d;
  try { d = decode(r); } catch { return res; }
  if (!d || !Array.isArray(d.r)) return res;

  const runs = d.r.map((x) => ({ t: String(x[1] || "?"), a: String(x[2] || ""), win: !!x[3], secs: (+x[4] || 0) / 100, clip: +x[5] || 0, art: unpackArt(x[7]) }));
  const wins = runs.filter((x) => x.win), n = runs.length;
  const miss = runs.filter((x) => !x.win).pop();
  let st = 0, best = 0;
  runs.forEach((x) => { st = x.win ? st + 1 : 0; best = Math.max(best, st); });
  const times = wins.map((x) => x.secs);
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const quick = wins.filter((x) => x.clip <= 1).length;
  const dk = DIFFS[d.d] ? d.d : "normal";
  const score = +d.s || 0;
  const mode = String(d.m || "All artists");

  const title = d.w ? `Perfect run: ${score} points on ${DIFFS[dk]}` : `${score} points on ${DIFFS[dk]}, can you beat it?`;
  const lines = [
    `✅ ${wins.length}/${n} songs right  ·  🔥 best streak ${best}`,
    times.length ? `⚡ avg guess ${avg.toFixed(1)}s  ·  fastest ${Math.min(...times).toFixed(2)}s  ·  ${quick} in ≤1s` : "",
    `🎧 ${mode}`,
    Array.isArray(d.mo) && d.mo.length ? `🎛️ ${d.mo.map((k) => MODS[k]).filter(Boolean).join(", ")}` : "",
    d.at ? `🕒 ${sharedAt(+d.at, d.tz)}` : "",
    miss ? `❌ went out on "${miss.t}" by ${miss.a}` : "",
  ].filter(Boolean);
  const desc = lines.join("\n");
  const pick = wins.filter((x) => x.art).sort((a, b) => a.secs - b.secs)[0] || runs.find((x) => x.art);

  const meta = [
    `<title>${esc(title)}</title>`,
    `<meta name="ugnp-share" content="${esc(r)}">`,
    `<meta property="og:site_name" content="UGNeekPeek">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(request.url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="theme-color" content="${COLORS[dk]}">`,
    `<meta name="twitter:card" content="summary">`,
    pick ? `<meta property="og:image" content="${esc(pick.art)}">` : "",
  ].join("\n");

  let html = await res.text();
  html = html.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta (?:property="og:[^"]*"|name="(?:description|theme-color|twitter:[^"]*)")[^>]*>\n?/gi, "").replace(/<meta charset[^>]*>/i, (m) => m + "\n" + meta);
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(html, { status: res.status, headers });
};

export const config = { path: "/*" };
