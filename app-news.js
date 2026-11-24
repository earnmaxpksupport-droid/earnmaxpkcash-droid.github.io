import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const TAGS = { update: ["🆕", "Update", "#dcfce7", "#166534"], fix: ["🛠️", "Fix", "#dbeafe", "#1e40af"], offer: ["🎁", "Offer", "#fef3c7", "#92400e"], important: ["⚠️", "Important", "#fee2e2", "#991b1b"] };
let u = null, stop = null, list = [];

{ const st = document.createElement("style"); st.textContent = `
#nav a[data-n=news]{position:relative}.nw-dot{position:absolute;top:2px;left:calc(50% + 8px);width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid var(--card)}
.nw-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin-bottom:12px}
.nw-card.pin{border-color:#facc15;box-shadow:0 0 0 2px rgba(250,204,21,.25)}
.nw-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.nw-tag{padding:3px 10px;border-radius:99px;font-size:12px;font-weight:800}
.nw-date{margin-left:auto;font-size:12px;opacity:.65}
.nw-card h3{margin:0 0 6px;font-size:17px}
.nw-body{white-space:pre-wrap;word-break:break-word;font-size:14.5px;line-height:1.55}
.nw-img{display:block;width:100%;border-radius:12px;margin:6px 0 8px;cursor:zoom-in}.nw-lb{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.9);display:grid;place-items:center;padding:12px}.nw-lb img{max-width:100%;max-height:100%;border-radius:10px}
.nw-empty{text-align:center;padding:30px 16px;opacity:.75}`; document.head.appendChild(st); }

const seenKey = () => "emp-news-seen-" + (u ? u.uid : "");
const seen = () => { try { return Number(localStorage.getItem(seenKey())) || 0; } catch (e) { return 0; } };
const ms = x => x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : 0;
const newest = () => list.reduce((m, x) => Math.max(m, ms(x)), 0);

function badge() {
  const a = document.querySelector('#nav a[data-n="news"]'); if (!a) return;
  let d = a.querySelector(".nw-dot");
  const unread = !!u && newest() > seen() && location.hash !== "#news";
  if (unread && !d) a.append(mk("i", "nw-dot"));
  if (!unread && d) d.remove();
}
function markSeen() { if (!u || !list.length) return; try { localStorage.setItem(seenKey(), String(newest())); } catch (e) {} badge(); }

function zoom(d) {
  const o = mk("div", "nw-lb"), im = mk("img"); im.src = d; o.append(im); o.onclick = () => o.remove(); document.body.append(o);
}
function draw() {
  const c = $("nwList"); if (!c) return;
  c.textContent = "";
  if (!list.length) { const e = mk("div", "nw-card nw-empty"); e.append(mk("div", null, "📢"), mk("div", null, "No updates yet. Daily news and changes will appear here.")); c.append(e); return; }
  list.slice().sort((a, b) => (b.pinned === true) - (a.pinned === true) || (ms(b) || 9e15) - (ms(a) || 9e15)).forEach(x => {
    const t = TAGS[x.tag] || TAGS.update, card = mk("div", "nw-card" + (x.pinned ? " pin" : "")), top = mk("div", "nw-top");
    const tag = mk("span", "nw-tag", t[0] + " " + t[1]); tag.style.background = t[2]; tag.style.color = t[3];
    top.append(tag); if (x.pinned) top.append(mk("span", null, "📌"));
    const d = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : null;
    top.append(mk("span", "nw-date", d ? d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Just now"));
    card.append(top, mk("h3", null, x.title || ""));
    (x.images || []).filter(d => typeof d === "string" && d.startsWith("data:image/jpeg;base64,")).slice(0, 3).forEach(d => { const im = mk("img", "nw-img"); im.src = d; im.alt = x.title || "Update"; im.loading = "lazy"; im.onclick = () => zoom(d); card.append(im); });
    if (x.body) card.append(mk("div", "nw-body", x.body));
    c.append(card);
  });
}
addEventListener("hashchange", () => { if (location.hash === "#news") { draw(); markSeen(); } else badge(); });

export function startNews(user) {
  stopNews(); u = user;
  stop = F.onSnapshot(F.query(F.collection(db, "announcements"), F.orderBy("createdAt", "desc"), F.limit(30)), s => {
    list = s.docs.map(d => ({ id: d.id, ...d.data() })); draw();
    if (location.hash === "#news") markSeen(); else badge();
  }, () => {});
}
export function stopNews() { if (stop) stop(); stop = null; u = null; list = []; const a = document.querySelector('#nav a[data-n="news"] .nw-dot'); if (a) a.remove(); }
