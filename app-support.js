import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NAME = { open: "Waiting", answered: "Replied", closed: "Closed" }, PILL = { open: "p1", answered: "p2", closed: "p3" };
let u = null, stop = null, list = [], busy = false, last = 0, wired = false;
const when = t => t && t.toDate ? t.toDate().toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Just now";

function draw() {
  const c = $("hsList"); if (!c) return; if (!c._e) c._e = c.innerHTML;
  c.textContent = ""; if (!list.length) { c.innerHTML = c._e; return; }
  list.slice().sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e12) - (a.createdAt ? a.createdAt.seconds : 9e12)).forEach(t => {
    const card = mk("div", "card"), h = mk("div"), st = t.status || "open";
    card.style.marginBottom = "12px"; h.style.cssText = "display:flex;gap:10px;align-items:center;justify-content:space-between";
    h.append(mk("b", null, t.subject), mk("span", "pill " + PILL[st], NAME[st] || "Waiting")); card.append(h, mk("small", "mute", when(t.createdAt)));
    const m = mk("p", null, t.message); m.style.cssText = "margin:8px 0 0;white-space:pre-wrap;word-break:break-word"; card.append(m);
    if (t.reply) { const r = mk("div"); r.style.cssText = "margin-top:10px;padding:10px 12px;border-radius:12px;background:#dcfce7;color:#14532d;white-space:pre-wrap;word-break:break-word;font-size:14px"; r.append(mk("b", null, "Support reply"), mk("br"), document.createTextNode(t.reply)); card.append(r); }
    c.append(card);
  });
}
async function send() {
  if (busy || !u) return;
  const subject = $("hsSubj").value.trim(), message = $("hsMsg").value.trim();
  if (subject.length < 3) return say("Please write a short subject.");
  if (message.length < 5) return say("Please describe the problem.");
  if (Date.now() - last < 20000) return say("Please wait a few seconds before sending another message.");
  busy = true; const b = $("hsSend"); b.disabled = true;
  try {
    let name = "Member"; try { name = ((await F.getDoc(F.doc(db, "users", u.uid))).data() || {}).name || "Member"; } catch (e) {}
    await F.addDoc(F.collection(db, "tickets"), { uid: u.uid, userName: String(name).slice(0, 60), userEmail: String(u.email || "").slice(0, 120), subject: subject.slice(0, 80), message: message.slice(0, 1000), status: "open", createdAt: F.serverTimestamp() });
    last = Date.now(); $("hsSubj").value = ""; $("hsMsg").value = ""; say("Sent. Our support team will reply here.");
  } catch (e) { say("Couldn’t send. Please check your internet and try again."); }
  busy = false; b.disabled = false;
}
export function startSupport(user) {
  stopSupport(); u = user;
  if (!wired && $("hsSend")) { wired = true; $("hsSend").onclick = send; }
  stop = F.onSnapshot(F.query(F.collection(db, "tickets"), F.where("uid", "==", u.uid), F.limit(50)), s => { list = s.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, () => {});
}
export function stopSupport() { if (stop) stop(); stop = null; u = null; list = []; }
