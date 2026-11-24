import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let u = null, stop = null, list = [], seq = 0;

const day = t => t && t.toDate ? t.toDate().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Just now";
function row(r) {
  const d = mk("div", "tx"), m = mk("div"); m.style.flex = "1";
  m.append(mk("b", null, r.refereeName || "Friend"), mk("br"), mk("small", "mute", "Joined " + day(r.createdAt)));
  const paid = r.status === "paid";
  d.append(m, mk("span", "pill " + (paid ? "p2" : "p1"), paid ? "Paid" : "Pending")); return d;
}
function group(title, items) {
  const c = $("frList"); if (!items.length) return;
  const h = mk("div", "sec"); h.append(mk("h3", null, title + " (" + items.length + ")")); c.append(h);
  const card = mk("div", "card"); card.style.padding = "4px 14px"; items.forEach(r => card.append(row(r))); c.append(card);
}
function load() {
  const c = $("frList"); if (!c || !u) return;
  const my = ++seq, paid = list.filter(r => r.status === "paid"), wait = list.filter(r => r.status !== "paid");
  $("frPaid").textContent = String(paid.length); $("frWait").textContent = String(wait.length);
  if (!list.length) { c.textContent = ""; const e = mk("div", "card empty"); e.append(mk("div", "ic", "👥"), document.createTextNode("No friends yet. Share your code to invite friends.")); c.append(e); return; }
  const full = list.slice(0, 100);
  if (my !== seq) return;
  const byNew = (a, b) => (b.createdAt ? b.createdAt.seconds : 9e12) - (a.createdAt ? a.createdAt.seconds : 9e12);
  c.textContent = "";
  group("⏳ Pending", full.filter(r => r.status !== "paid").sort(byNew));
  group("✅ Completed", full.filter(r => r.status === "paid").sort(byNew));
}
addEventListener("hashchange", () => { if (location.hash === "#friends") load(); });
export function startRefs(user) {
  stopRefs(); u = user;
  stop = F.onSnapshot(F.query(F.collection(db, "referrals"), F.where("referrerUid", "==", u.uid), F.limit(100)), s => { list = s.docs.map(d => ({ id: d.id, ...d.data() })); if (location.hash === "#friends") load(); }, () => {});
}
export function stopRefs() { if (stop) stop(); stop = null; u = null; list = []; seq++; }
