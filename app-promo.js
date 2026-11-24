import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m), snd = n => window.Sfx && window.Sfx.play(n);
const bad = m => { say(m); snd("error"); };
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = n => "PKR " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const worth = o => [o.reward > 0 ? fmt(o.reward) : "", o.coins > 0 ? Number(o.coins).toLocaleString("en-PK") + " 🪙" : ""].filter(Boolean).join(" + ") || "—";
let u = null, stops = [], hist = [], page = null, isOpen = false, busy = false;

{ const st = document.createElement("style"); st.textContent = `
.prx-home{display:flex;align-items:center;gap:12px;margin-top:10px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);color:#4c1d95;border:1px solid #c4b5fd;cursor:pointer}
.prx-home b{font-size:16px}.prx-home small{display:block;font-weight:600;opacity:.85}.prx-home .ar{margin-left:auto;font-size:22px;font-weight:800}
.prx-page{position:fixed;inset:0;z-index:60;background:var(--bg,#f1faf3);color:var(--ink,#0f2a1a);overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 90px;font-family:inherit}
.prx-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px}.prx-bar h2{margin:0;font-size:20px;flex:1;text-align:center}
.prx-back{width:42px;height:42px;border-radius:14px;border:1px solid var(--line,#dcecdf);background:var(--card,#fff);color:inherit;font-size:20px;font-weight:700}
.prx-card{background:var(--card,#fff);border:1px solid var(--line,#dcecdf);border-radius:18px;padding:16px;margin-bottom:12px}
.prx-hero{text-align:center;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#fff;border:0}
.prx-hero .e{font-size:44px}.prx-hero b{display:block;font-size:19px;margin:4px 0}.prx-hero span{font-size:13px;opacity:.9}
.prx-in{width:100%;box-sizing:border-box;margin-top:12px;padding:14px;border-radius:14px;border:2px dashed #a78bfa;background:#faf5ff;color:#3b0764;font:800 20px system-ui,sans-serif;letter-spacing:3px;text-align:center;text-transform:uppercase}
.prx-b{width:100%;margin-top:12px;min-height:50px;border:0;border-radius:14px;background:linear-gradient(180deg,#8b5cf6,#6d28d9);color:#fff;font-size:17px;font-weight:800}
.prx-b:disabled{opacity:.6}
.prx-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#dcecdf)}.prx-row:last-child{border:0}
.prx-m{font-size:13px;opacity:.7}.prx-ok{color:#16a34a;font-weight:800}
.prx-win{text-align:center;margin-top:12px;padding:12px;border-radius:14px;background:#dcfce7;color:#166534;font-weight:800}`; document.head.appendChild(st); }

function drawPage() {
  const c = $("prxHist"); if (!c) return;
  c.textContent = "";
  if (!hist.length) { c.append(mk("div", "prx-m", "You haven’t used any promo code yet.")); return; }
  hist.slice().sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e9) - (a.createdAt ? a.createdAt.seconds : 9e9)).slice(0, 20).forEach(x => {
    const r = mk("div", "prx-row"), m = mk("div"); m.style.flex = "1";
    m.append(mk("b", null, x.code), mk("br"), mk("span", "prx-m", x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toLocaleDateString() : "Just now"));
    r.append(m, mk("span", "prx-ok", "+ " + worth(x))); c.append(r);
  });
}
async function redeem() {
  if (busy || !u) return;
  const inp = $("prxCode"), btn = $("prxBtn"), win = $("prxWin"), code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  win.hidden = true;
  if (!/^[A-Z0-9]{4,20}$/.test(code)) return bad("Enter a valid promo code.");
  busy = true; btn.disabled = true;
  try {
    const pr = F.doc(db, "promoCodes", code), rid = code + "_" + u.uid, rr = F.doc(db, "promoRedeems", rid);
    const [ps, rs] = await Promise.all([F.getDoc(pr), F.getDoc(rr)]);
    if (!ps.exists()) throw new Error("none");
    const p = ps.data();
    if (rs.exists()) throw new Error("used");
    if (p.active !== true) throw new Error("off");
    if (p.expiresMs && Date.now() > p.expiresMs) throw new Error("expired");
    if (p.maxUses > 0 && (p.used || 0) >= p.maxUses) throw new Error("full");
    const reward = Number(p.reward) || 0, coins = Number(p.coins) || 0;
    const bt = F.writeBatch(db);
    bt.set(rr, { uid: u.uid, userName: (u.displayName || "Member").slice(0, 60), code, reward, coins, createdAt: F.serverTimestamp() });
    bt.update(pr, { used: F.increment(1) });
    bt.update(F.doc(db, "wallets", u.uid), { balance: F.increment(reward), totalEarned: F.increment(reward), coins: F.increment(coins), lastPromo: rid, updatedAt: F.serverTimestamp() });
    if (reward > 0) bt.set(F.doc(db, "users", u.uid, "ledger", "promo_" + code), { type: "promo", amount: reward, status: "approved", note: "Promo " + code, by: u.uid, createdAt: F.serverTimestamp() });
    await bt.commit();
    snd("success"); inp.value = ""; win.textContent = "🎉 You received " + worth({ reward, coins }) + "!"; win.hidden = false; if (window.EmpFx) EmpFx.show("promo", { title: "Promo code applied!", sub: reward > 0 && coins > 0 ? "Plus " + coins + " coins. Added to your wallet." : "Added to your wallet.", amount: reward > 0 ? reward : coins, prefix: reward > 0 ? "PKR " : "", suffix: reward > 0 ? "" : " coins" }); else say("Promo code applied. Reward added to your wallet.");
  } catch (e) {
    const m = { none: "This promo code is not valid.", used: "You have already used this code.", off: "This promo code is not active right now.", expired: "This promo code has expired.", full: "This promo code has reached its limit." }[e.message];
    bad(m || (e.code === "permission-denied" ? "This code can’t be used right now. It may be expired, full, or already used." : "Couldn’t apply the code. Please try again."));
  }
  busy = false; btn.disabled = false;
}
function openPage() {
  if (page || !u) return;
  page = mk("div", "prx-page"); const bar = mk("div", "prx-bar"), back = mk("button", "prx-back", "‹"), h = mk("h2", null, "Promo code"); back.onclick = () => closePage();
  const sp = mk("span"); sp.style.width = "42px"; bar.append(back, h, sp);
  const hero = mk("div", "prx-card prx-hero"); hero.append(mk("div", "e", "🎟️"), mk("b", null, "Redeem your promo code"), mk("span", null, "Enter the code you received to get PKR or coins."));
  const inp = mk("input", "prx-in"); inp.id = "prxCode"; inp.maxLength = 20; inp.placeholder = "ENTER CODE"; inp.autocomplete = "off"; inp.autocapitalize = "characters"; inp.spellcheck = false;
  inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
  inp.onkeydown = e => { if (e.key === "Enter") redeem(); };
  const btn = mk("button", "prx-b", "Redeem"); btn.id = "prxBtn"; btn.onclick = redeem;
  const win = mk("div", "prx-win"); win.id = "prxWin"; win.hidden = true;
  const form = mk("div", "prx-card"); form.append(mk("b", null, "Promo code"), inp, btn, win);
  const hc = mk("div", "prx-card"); hc.append(mk("b", null, "Your redeemed codes")); const hl = mk("div"); hl.id = "prxHist"; hl.style.marginTop = "8px"; hc.append(hl);
  page.append(bar, hero, form, hc); document.body.append(page);
  history.pushState({ pr: 1 }, "", location.href); isOpen = true; drawPage();
}
function closePage() {
  if (!page) return; page.remove(); page = null; const was = isOpen; isOpen = false;
  if (was && history.state && history.state.pr) history.back();
}
addEventListener("popstate", () => { if (isOpen) { isOpen = false; if (page) { page.remove(); page = null; } } });
function mount() {
  if ($("prxHome")) return; const home = document.querySelector('[data-s="home"]'), bal = home && home.querySelector(".bal"); if (!home || !bal) return;
  const c = mk("div", "prx-home"); c.id = "prxHome"; const t = mk("div"); t.append(mk("b", null, "🎟️ Have a promo code?"), mk("small", null, "Redeem it for PKR or coins")); c.append(t, mk("span", "ar", "›")); c.onclick = openPage; bal.after(c);
}
window.EmpPromo = { open: openPage };
export function startPromo(user) {
  stopPromo(); u = user; mount(); setTimeout(mount, 600); setTimeout(mount, 2000);
  stops.push(F.onSnapshot(F.query(F.collection(db, "promoRedeems"), F.where("uid", "==", u.uid), F.limit(30)), s => { hist = s.docs.map(d => d.data()); drawPage(); }, () => {}));
}
export function stopPromo() { stops.forEach(f => f()); stops = []; u = null; hist = []; if (page) { page.remove(); page = null; isOpen = false; } const h = $("prxHome"); if (h) h.remove(); }
