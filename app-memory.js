import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m), snd = n => { try { window.Sfx && window.Sfx.play(n); } catch (e) {} };
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const pkt = ms => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
const LV = { 1: { pairs: 6, cols: 3 }, 2: { pairs: 8, cols: 4 }, 3: { pairs: 10, cols: 4 } };
const EM = ["🍎", "🍌", "🍇", "🍓", "🍒", "🍋", "🍉", "🍍", "🍑", "🍐"];
let u = null, stops = [], cfg = {}, wins = [], winStop = null, winDay = "", wired = false;
let lv = 1, deck = [], st = [], open = [], lock = false, moves = 0, matched = 0, t0 = 0, tick = null, done = false;

{ const s = document.createElement("style"); s.textContent = `
.mm-lv{display:flex;gap:8px;margin:4px 0 12px}.mm-lv button{flex:1;padding:10px 0;border-radius:14px;border:2px solid var(--line);background:var(--card);font-weight:800;color:inherit}.mm-lv button.on{background:#16a34a;color:#fff;border-color:#16a34a}
.mm-st{display:flex;gap:8px;margin-bottom:12px}.mm-st div{flex:1;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px 4px;text-align:center;font-size:12px}.mm-st b{display:block;font-size:19px}
.mm-b{display:grid;gap:8px;margin:0 auto 12px;max-width:380px}
.mm-c{aspect-ratio:1;border:0;border-radius:16px;padding:0;position:relative;font-size:34px;background:linear-gradient(145deg,#7c3aed,#4f46e5);color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.18);transition:transform .25s}
.mm-c .b{display:none}.mm-c.on{background:#fff;color:#111;transform:rotateY(0);box-shadow:0 4px 0 rgba(0,0,0,.12)}.mm-c.on .b{display:block}.mm-c.on .f{display:none}
.mm-c.ok{background:#dcfce7;box-shadow:0 0 0 3px #22c55e}.mm-c .f{font-weight:900;opacity:.9}
.mm-m{text-align:center;padding:14px;border-radius:16px;margin:10px 0;font-weight:700;background:var(--card);border:1px solid var(--line);white-space:pre-wrap}`; document.head.appendChild(s); }

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const maxD = () => cfg.enabled === true ? (cfg.maxPerDay || 0) : 0, prizeOf = l => cfg.enabled === true ? (cfg["prize" + l] || 0) : 0;
const left = () => { const day = pkt(Date.now()); return Math.max(0, maxD() - wins.filter(w => w.day === day).length); };
function info() {
  const e = $("mmPrize"); if (!e) return;
  const p = prizeOf(lv), m = maxD();
  e.textContent = p > 0 && m > 0 ? "Match all cards to win " + p + " coins at this level. " + left() + " of " + m + " rewards left today." : (m > 0 ? "No reward at this level. Try another level." : "Practice mode: match all the cards. Rewards are not on right now.");
  $("mmLeft").textContent = p > 0 && m > 0 ? String(left()) : "—";
}
function upd() { $("mmMoves").textContent = String(moves); $("mmTime").textContent = t0 ? Math.floor((Date.now() - t0) / 1000) + "s" : "0s"; }
function paint(i) { const b = $("mmBoard").children[i]; if (!b) return; b.classList.toggle("on", st[i] > 0); b.classList.toggle("ok", st[i] === 2); }
function newGame(level) {
  if (level) lv = level;
  clearInterval(tick); tick = null; t0 = 0; moves = 0; matched = 0; open = []; lock = false; done = false;
  const L = LV[lv]; deck = shuffle(EM.slice(0, L.pairs).concat(EM.slice(0, L.pairs))); st = deck.map(() => 0);
  const bd = $("mmBoard"); bd.textContent = ""; bd.style.gridTemplateColumns = "repeat(" + L.cols + ",1fr)";
  deck.forEach((e, i) => { const b = mk("button", "mm-c"); b.type = "button"; b.setAttribute("aria-label", "Card " + (i + 1)); b.append(mk("span", "f", "?"), mk("span", "b", e)); b.onclick = () => flip(i); bd.append(b); });
  [...$("mmLv").children].forEach((b, i) => b.classList.toggle("on", i + 1 === lv));
  $("mmMsg").hidden = true; upd(); info();
}
function flip(i) {
  if (lock || done || st[i] !== 0) return;
  if (!t0) { t0 = Date.now(); tick = setInterval(upd, 500); }
  st[i] = 1; paint(i); open.push(i); snd("tap");
  if (open.length < 2) return;
  moves++; upd();
  const [a, b] = open;
  if (deck[a] === deck[b]) { st[a] = st[b] = 2; paint(a); paint(b); open = []; matched++; if (matched === LV[lv].pairs) finish(); }
  else { lock = true; setTimeout(() => { st[a] = st[b] = 0; paint(a); paint(b); open = []; lock = false; }, 700); }
}
function show(t) { const m = $("mmMsg"); m.textContent = t; m.hidden = false; }
async function finish() {
  clearInterval(tick); tick = null; done = true; upd();
  const secs = Math.max(1, Math.round((Date.now() - t0) / 1000)), prize = prizeOf(lv), max = maxD(), day = pkt(Date.now()), used = wins.filter(w => w.day === day).length;
  snd("success");
  if (!(prize > 0 && max > 0)) return show("🎉 You matched all the cards!\nRewards are not on right now.");
  if (used >= max) return show("🎉 You matched all the cards!\nYou have used all of today’s rewards. Come back tomorrow.");
  if (secs < 8) return show("🎉 Matched!\nThat was too fast to count for a reward. Try again.");
  show("🎉 Matched in " + moves + " moves!\nSaving your reward…");
  try {
    const n = used + 1, id = "memory_" + day + "_" + n, bt = F.writeBatch(db);
    bt.set(F.doc(db, "users", u.uid, "memoryWins", id), { day, n, level: lv, prize, moves, secs, createdAt: F.serverTimestamp() });
    bt.update(F.doc(db, "wallets", u.uid), { coins: F.increment(prize), lastMemory: id, updatedAt: F.serverTimestamp() });
    await bt.commit(); show("🎉 You won " + prize + " coins!\nMatched in " + moves + " moves, " + secs + " seconds."); snd("coin"); if (window.EmpFx) EmpFx.show(lv === 3 ? "bigwin" : "win", { title: lv === 3 ? "BIG WIN!" : "You won!", amount: prize, suffix: " coins", sub: "Memory Game · Level " + lv });
  } catch (e) { show("🎉 You matched all the cards!\nThe reward couldn’t be saved. Please try again later."); }
}
function subWins() {
  if (winStop) winStop(); winDay = pkt(Date.now());
  winStop = F.onSnapshot(F.query(F.collection(db, "users", u.uid, "memoryWins"), F.where("day", "==", winDay), F.limit(50)), s => { wins = s.docs.map(d => d.data()); info(); }, () => {});
}
export function startMemory(user) {
  stopMemory(); u = user;
  if (!wired && $("mmBoard")) {
    wired = true;
    const lvb = $("mmLv"); [1, 2, 3].forEach(n => { const b = mk("button", null, "Level " + n); b.type = "button"; b.onclick = () => newGame(n); lvb.append(b); });
    $("mmNew").onclick = () => newGame();
    addEventListener("hashchange", () => { if (location.hash === "#memory" && u) { if (winDay !== pkt(Date.now())) subWins(); newGame(); } else { clearInterval(tick); tick = null; } });
  }
  stops.push(F.onSnapshot(F.doc(db, "settings", "memory"), s => { cfg = s.data() || {}; info(); }, () => {}));
  subWins(); if ($("mmBoard")) newGame();
}
export function stopMemory() { stops.forEach(f => f()); stops = []; if (winStop) winStop(); winStop = null; u = null; wins = []; clearInterval(tick); tick = null; }
