import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = n => "PKR " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const NAMES = { jazzcash: "JazzCash", easypaisa: "Easypaisa" }, PILL = { pending: "p1", approved: "p2", rejected: "p3" };
let u = null, stops = [], lock = null, wal = null, deps = [], page = null, isOpen = false;
const need = () => (lock && Number(lock.minDeposit)) || 0, done = () => (wal && Number(wal.deposited)) || 0;
const unlocked = () => !!wal && wal.wdUnlocked === true;
const isLocked = () => !!(lock && lock.enabled === true && wal && !unlocked() && done() < need());

{ const st = document.createElement("style"); st.textContent = `
.ulx-home{display:flex;align-items:center;gap:12px;margin-top:10px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#78350f;border:1px solid #fcd34d;cursor:pointer}
.ulx-home b{font-size:16px}.ulx-home small{display:block;font-weight:600;opacity:.85}.ulx-home .ar{margin-left:auto;font-size:22px;font-weight:800}
.ulx-page{position:fixed;inset:0;z-index:60;background:var(--bg,#f1faf3);color:var(--ink,#0f2a1a);overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 90px;font-family:inherit}
.ulx-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px}.ulx-bar h2{margin:0;font-size:20px;flex:1;text-align:center}
.ulx-back{width:42px;height:42px;border-radius:14px;border:1px solid var(--line,#dcecdf);background:var(--card,#fff);color:inherit;font-size:20px;font-weight:700}
.ulx-card{background:var(--card,#fff);border:1px solid var(--line,#dcecdf);border-radius:18px;padding:16px;margin-bottom:12px}
.ulx-big{font-size:20px;font-weight:800;margin-bottom:6px}.ulx-m{color:var(--mute,#5f7d6a);font-size:14px;line-height:1.45}
.ulx-track{height:14px;border-radius:99px;background:var(--soft,#e2f7e6);overflow:hidden;margin:14px 0 6px}.ulx-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#22c55e,#facc15);transition:width .5s}
.ulx-b{width:100%;min-height:46px;margin-top:12px;border-radius:14px;border:0;background:linear-gradient(180deg,#22c55e,#0a5c28);color:#fff;font-weight:800;font-size:16px}
.ulx-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line,#dcecdf)}.ulx-row>div{flex:1}`; document.head.appendChild(st); }

function drawPage() {
  if (!page) return; const c = $("ulxBody"); c.textContent = "";
  const card = mk("div", "ulx-card");
  if (!lock || lock.enabled !== true || unlocked() || done() >= need()) {
    card.append(mk("div", "ulx-big", "✅ Withdrawal unlocked"), mk("div", "ulx-m", "You can withdraw your balance now."));
    const b = mk("button", "ulx-b", "Withdraw now"); b.onclick = () => { closePage(true); location.hash = "withdraw"; }; card.append(b);
  } else {
    const n = need(), d = done(), left = Math.max(0, n - d);
    card.append(mk("div", "ulx-big", "🔒 Withdrawal is locked"), mk("div", "ulx-m", (lock.message || "").trim() || "Deposit at least " + fmt(n) + ". After the admin verifies your deposit, withdrawals unlock."));
    const t = mk("div", "ulx-track"), f = mk("div", "ulx-fill"); f.style.width = Math.min(100, n > 0 ? d / n * 100 : 0) + "%"; t.append(f); card.append(t, mk("div", "ulx-m", fmt(d) + " of " + fmt(n) + " deposited · " + fmt(left) + " to go"));
    const pend = deps.filter(x => x.status === "pending"); if (pend.length) card.append(mk("div", "ulx-m", "⏳ " + pend.length + " deposit" + (pend.length > 1 ? "s are" : " is") + " waiting for admin approval (" + fmt(pend.reduce((s, x) => s + (x.amount || 0), 0)) + ")."));
    const b = mk("button", "ulx-b", "Make a deposit"); b.onclick = () => { closePage(true); location.hash = "deposit"; }; card.append(b);
  }
  c.append(card);
  if (deps.length) {
    const l = mk("div", "ulx-card"); l.append(mk("div", "ulx-big", "Your deposits"));
    deps.slice().sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e9) - (a.createdAt ? a.createdAt.seconds : 9e9)).slice(0, 10).forEach(x => {
      const r = mk("div", "ulx-row"), m = mk("div"); m.append(mk("b", null, fmt(x.amount)), mk("br"), mk("span", "ulx-m", (NAMES[x.method] || x.method) + " · " + (x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toLocaleDateString() : "Just now")));
      r.append(m, mk("span", "pill " + (PILL[x.status] || "p1"), x.status)); l.append(r);
    }); c.append(l);
  }
}
function openPage() {
  if (page || !u) return;
  page = mk("div", "ulx-page"); const bar = mk("div", "ulx-bar"), back = mk("button", "ulx-back", "‹"), h = mk("h2", null, (lock && lock.title) || "Unlock your withdrawal"); back.onclick = () => closePage(false);
  const sp = mk("span"); sp.style.width = "42px"; bar.append(back, h, sp); const body = mk("div"); body.id = "ulxBody"; page.append(bar, body); document.body.append(page);
  history.pushState({ ul: 1 }, "", location.href); isOpen = true; drawPage();
}
function closePage(nav) {
  if (!page) return; page.remove(); page = null; const was = isOpen; isOpen = false;
  if (nav) return; // moving to another page: leave the history alone
  if (location.hash === "#withdraw" && isLocked()) location.hash = "home";
  else if (was && history.state && history.state.ul) history.back();
}
addEventListener("popstate", () => { if (isOpen) { isOpen = false; if (page) { page.remove(); page = null; } if (location.hash === "#withdraw" && isLocked()) location.hash = "home"; } });
function gate() { if (location.hash === "#withdraw" && isLocked() && !page) openPage(); }
addEventListener("hashchange", gate);
function mount() {
  if ($("ulxHome")) return; const home = document.querySelector('[data-s="home"]'), bal = home && home.querySelector(".bal"); if (!home || !bal) return;
  const c = mk("div", "ulx-home"); c.id = "ulxHome"; c.hidden = true; const t = mk("div"), s = mk("small"); s.id = "ulxSub"; t.append(mk("b", null, "🔒 Unlock your withdrawal"), s); c.append(t, mk("span", "ar", "›")); c.onclick = openPage; bal.after(c);
}
function refresh() {
  mount(); const c = $("ulxHome"); if (c) { c.hidden = !isLocked(); if (!c.hidden) { c.querySelector("b").textContent = "🔒 " + ((lock && lock.title) || "Unlock your withdrawal"); $("ulxSub").textContent = "Deposit " + fmt(Math.max(0, need() - done())) + " more to unlock"; } }
  drawPage(); gate();
}
window.EmpLock = { locked: isLocked, open: openPage };
export function startUnlock(user) {
  stopUnlock(); u = user; mount();
  const er = () => {};
  stops.push(F.onSnapshot(F.doc(db, "settings", "withdrawLock"), s => { lock = s.data() || null; refresh(); }, er));
  stops.push(F.onSnapshot(F.doc(db, "wallets", u.uid), s => { wal = s.exists() ? s.data() : null; refresh(); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "deposits"), F.where("uid", "==", u.uid), F.limit(30)), s => { deps = s.docs.map(d => d.data()); drawPage(); }, er));
}
export function stopUnlock() { stops.forEach(f => f()); stops = []; if (page) { page.remove(); page = null; isOpen = false; } const h = $("ulxHome"); if (h) h.remove(); u = null; lock = null; wal = null; deps = []; }
