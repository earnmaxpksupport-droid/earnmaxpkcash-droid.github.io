import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m), snd = n => window.Sfx && window.Sfx.play(n);
const bad = m => { say(m); snd("error"); };
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let skew = 0; // server time minus phone time, so a wrong phone clock cannot break check-in
const nowMs = () => Date.now() + skew;
const pkt = ms => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10).replace(/-/g, ""); // Pakistan day (UTC+5)
const fmt = n => "PKR " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const ICON = { daily: "📅", social: "🔗", video: "▶️", special: "⭐" };
const left = () => { const now = nowMs(), p = new Date(now + 5 * 3600e3), next = Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + 1) - 5 * 3600e3; return Math.max(0, Math.floor((next - now) / 1000)); };
const hms = s => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, "0")).join(":");
let stops = [], u = null, wired = false, rewards = null, tasks = [], subs = [], ci = {}, cat = "all", ready = {}, tm = null, lastDay = "";
let playAt = {}; // when a Play task was opened: submit unlocks after the play time
const secsOf = t => t.playSecs != null ? t.playSecs : (t.category === "special" || t.category === "game" ? 30 : 0);
const waitLeft = id => { const p = playAt[id]; return p ? Math.max(0, Math.ceil((p.at + p.secs * 1000 - nowMs()) / 1000)) : 0; };
const rewardText = t => [t.reward > 0 ? fmt(t.reward) : "", t.coins > 0 ? (t.reward > 0 ? "+ " : "") + t.coins + " coins" : ""].filter(Boolean).join(" ") || fmt(0);
document.addEventListener("visibilitychange", () => { // how long the user is away playing, and when they come back
  const now = nowMs();
  for (const p of Object.values(playAt)) { if (document.hidden) { if (p.left == null) p.left = now; } else if (p.left != null) { p.away += now - p.left; p.left = null; p.back = now; } }
});
function btnState(b, t) {
  const w = ready[t.id] ? waitLeft(t.id) : 0;
  b.textContent = ready[t.id] ? (w > 0 ? (t.verification === "auto" && secsOf(t) === 0 ? "Please wait… " : "Playing… ") + w + "s" : (t.verification === "auto" ? "Claim reward" : "Submit")) : (secsOf(t) > 0 ? "Play" : "Start");
  b.disabled = w > 0;
}

try { const r = new URLSearchParams(location.search).get("ref"); if (r && $("rRef")) $("rRef").value = r.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); } catch (e) {}

function icon(t) { if (t.icon) { const i = mk("img", "tic"); i.src = t.icon; i.alt = ""; return i; } return mk("div", "ic", t.emoji || ICON[t.category] || "⭐"); }
function openLink(url) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; if (/\.apk(\?|$)/i.test(url)) a.download = ""; document.body.appendChild(a); a.click(); a.remove(); }
async function openShots(t) {
  try {
    const s = (await F.getDoc(F.doc(db, "taskMedia", t.id))).data(), imgs = (s && s.shots) || t.images || [];
    if (!imgs.length) return say("No screenshots yet.");
    const ov = mk("div", "ov"), card = mk("div", "card"), x = mk("button", "btn", "Close"); card.style.cssText = "max-height:82vh;overflow:auto"; card.append(mk("h3", null, t.title));
    imgs.forEach(src => { const i = mk("img"); i.src = src; i.alt = ""; i.style.cssText = "width:100%;border-radius:12px;margin-top:10px"; card.append(i); });
    x.style.marginTop = "12px"; x.onclick = () => ov.remove(); card.append(x); ov.append(card); document.body.append(ov);
  } catch (e) { bad("Couldn’t load the screenshots."); }
}
function drawTasks() {
  const c = $("taskList"); if (!c) return;
  if (!c._e) c._e = c.innerHTML;
  c.textContent = "";
  const day = pkt(nowMs()), l = tasks.filter(t => cat === "all" || t.category === cat);
  if (!l.length) { c.innerHTML = c._e; return; }
  l.forEach(t => {
    const once = t.repeat === "once", mine = subs.filter(s => s.taskId === t.id), tdy = mine.filter(s => s.day === day), card = mk("div", "card task"), mid = mk("div"), r = mk("div", "r"), b = mk("button", "btn");
    const onceDone = once && mine.some(s => s.status === "approved"), oncePend = once && mine.some(s => s.day === "once" && s.status === "pending"), onceRej = once && mine.some(s => s.day === "once" && s.status === "rejected");
    const used = tdy.length, max = t.dailyLimit || 1, pend = tdy.some(s => s.status === "pending");
    mid.append(mk("b", null, t.title), mk("small", "mute", (t.instructions || t.category) + " · " + (once ? (onceDone ? "one-time · completed" : "one-time task") : "today " + used + "/" + max)));
    const apk = t.apkUrl || t.apk, media = t.hasMedia || (t.images && t.images.length);
    if (apk || media) {
      const ex = mk("div"); ex.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:6px";
      if (apk) { const a = mk("button", "btn sm out", /\.apk(\?|$)/i.test(apk) ? "Download APK" : "Open link"); a.style.minHeight = "34px"; a.onclick = () => openLink(apk); ex.append(a); }
      if (media) { const a = mk("button", "btn sm out", "Screenshots"); a.style.minHeight = "34px"; a.onclick = () => openShots(t); ex.append(a); }
      mid.append(ex);
    }
    r.append(mk("span", null, rewardText(t)), mk("br"));
    if (once) {
      if (onceDone) { b.textContent = "Completed ✓"; b.disabled = true; card.style.opacity = ".85"; }
      else if (oncePend) { b.textContent = "In review"; b.disabled = true; }
      else if (onceRej) { b.textContent = "Rejected"; b.disabled = true; }
      else { btnState(b, t); b.onclick = () => act(t, 1); }
    } else if (used >= max) { b.textContent = pend ? "In review" : "Done today"; b.disabled = true; }
    else { btnState(b, t); b.onclick = () => act(t, used + 1); }
    r.append(b); card.append(icon(t), mid, r); c.append(card);
  });
}
async function act(t, n) {
  const auto = t.verification === "auto", dayK = t.repeat === "once" ? "once" : pkt(nowMs()), sid = u.uid + "_" + t.id + "_" + dayK + "_" + n;
  if (!ready[t.id]) {
    const sec = secsOf(t); let at = nowMs();
    if (auto) { // the server records the first tap, so the wait cannot be skipped
      try {
        const sr = F.doc(db, "users", u.uid, "taskStarts", sid), sn = await F.getDoc(sr);
        if (sn.exists() && sn.data().createdAt && sn.data().createdAt.toMillis) at = sn.data().createdAt.toMillis();
        else await F.setDoc(sr, { createdAt: F.serverTimestamp() });
      } catch (e) { return bad("Couldn’t start the task. Check your internet and try again."); }
    }
    if (t.link) window.open(t.link, "_blank", "noopener");
    ready[t.id] = true; playAt[t.id] = { at, secs: auto ? sec + 3 : sec, away: 0, left: null, back: null };
    say(auto ? "Finish the task, then tap Claim reward." + (sec > 0 ? " Wait at least " + sec + " seconds." : "") : sec > 0 ? "Play for " + sec + " seconds, then tap Submit." : "Finish the task, then tap Submit."); drawTasks(); return;
  }
  if (waitLeft(t.id) > 0) return say("Keep playing. " + waitLeft(t.id) + " seconds left.");
  try {
    const day = dayK, p = playAt[t.id], now = nowMs();
    const play = p ? { startedAt: p.at, need: p.secs, awayMs: Math.round(p.away + (p.left != null ? now - p.left : 0)), backAt: p.back || now, afterMs: Math.round(now - p.at) } : null;
    if (auto) { // auto-approve: submission + wallet + ledger in one batch, every amount is checked by the Firestore rules
      const rw = t.reward || 0, cn = t.coins || 0, bt = F.writeBatch(db);
      bt.set(F.doc(db, "submissions", sid), { uid: u.uid, taskId: t.id, title: t.title, reward: rw, coins: cn, userName: u.displayName || "Member", day, n, status: "approved", auto: true, ...(play ? { play } : {}), createdAt: F.serverTimestamp() });
      bt.update(F.doc(db, "wallets", u.uid), { balance: F.increment(rw), totalEarned: F.increment(rw), tasksDone: F.increment(1), ...(cn > 0 ? { coins: F.increment(cn) } : {}), lastTask: sid, updatedAt: F.serverTimestamp() });
      if (rw > 0) bt.set(F.doc(db, "users", u.uid, "ledger", "task_" + sid), { type: "task", amount: rw, status: "approved", note: String(t.title || "Task").slice(0, 100) + (cn > 0 ? " (+" + cn + " coins)" : ""), by: u.uid, sub: sid, createdAt: F.serverTimestamp() });
      await bt.commit();
      delete ready[t.id]; delete playAt[t.id]; snd("reward");
      if (window.EmpFx) EmpFx.show("promo", { title: "Task completed!", sub: cn > 0 && rw > 0 ? "Plus " + cn + " coins. Added to your wallet." : "Your reward was added to your wallet.", amount: rw > 0 ? rw : cn, prefix: rw > 0 ? "PKR " : "", suffix: rw > 0 ? "" : " coins" }); else say("Task completed! Your reward was added.");
      return;
    }
    await F.setDoc(F.doc(db, "submissions", sid), { uid: u.uid, taskId: t.id, title: t.title, reward: t.reward, coins: t.coins || 0, userName: u.displayName || "Member", day, n, status: "pending", ...(play ? { play } : {}), createdAt: F.serverTimestamp() });
    delete ready[t.id]; delete playAt[t.id]; snd("success"); if (window.EmpFx) EmpFx.show("task", { title: "Task submitted!", sub: "You’ll be paid after an admin verifies it." }); else say("Submitted. You’ll be paid after an admin verifies it.");
  } catch (e) { bad(auto ? "Couldn’t add the reward yet. Wait a few more seconds and tap Claim reward again." : "Couldn’t submit. Check your phone’s date and time, then try again."); }
}
function drawCi() {
  if (!$("ciBtn")) return;
  const now = nowMs(), today = pkt(now), yest = pkt(now - 864e5), done = !!ci[today];
  const next = done ? ci[today].streak : (ci[yest] ? ci[yest].streak % 7 : 0) + 1;
  for (let i = 1; i <= 7; i++) {
    const el = $("day" + i), v = rewards && rewards.checkin ? rewards.checkin[i - 1] : 0, cv = rewards && rewards.checkinCoins ? rewards.checkinCoins[i - 1] : 0, parts = [];
    if (v > 0) parts.push(v); if (cv > 0) parts.push(cv + " coins");
    el.lastChild.textContent = parts.length ? parts.join(" + ") : "—";
    el.firstChild.textContent = "Day " + i + (i < next || (done && i === next) ? " ✓" : "");
    el.style.borderColor = i === next ? "var(--g2)" : "";
  }
  $("ciBtn").disabled = done; $("ciBtn").textContent = done ? "Claimed today ✓" : "Claim today’s reward"; tickCi();
}
function tickCi() {
  const b = $("ciBtn"); if (!b) return;
  let t = $("ciTimer");
  if (!t) { t = mk("div", "mute"); t.id = "ciTimer"; t.style.cssText = "text-align:center;margin-top:12px;font-weight:700;font-size:16px"; b.after(t); }
  t.textContent = ci[pkt(nowMs())] ? "Next check-in in " + hms(left()) : "Check-in is available now";
}
// Check-in is validated by Firestore rules: one claim per day, the right streak day, the PKR and coins set by the admin.
let claiming = false;
async function claim() {
  if (claiming) return;
  const now = nowMs(), today = pkt(now), yest = pkt(now - 864e5);
  if (ci[today]) return;
  const next = (ci[yest] ? ci[yest].streak % 7 : 0) + 1, amt = (rewards && rewards.checkin && rewards.checkin[next - 1]) || 0, cc = (rewards && rewards.checkinCoins && rewards.checkinCoins[next - 1]) || 0;
  if (!(amt > 0 || cc > 0)) return bad("The check-in reward isn’t set yet. Please check back later.");
  claiming = true; $("ciBtn").disabled = true;
  try {
    const bt = F.writeBatch(db);
    bt.set(F.doc(db, "users", u.uid, "checkins", today), { amount: amt, coins: cc, streak: next, createdAt: F.serverTimestamp() });
    bt.update(F.doc(db, "wallets", u.uid), { balance: F.increment(amt), totalEarned: F.increment(amt), coins: F.increment(cc), updatedAt: F.serverTimestamp() });
    if (amt > 0) bt.set(F.doc(db, "users", u.uid, "ledger", "checkin_" + today), { type: "checkin", amount: amt, status: "approved", note: "Daily check-in · Day " + next, by: u.uid, createdAt: F.serverTimestamp() });
    await bt.commit();
    ci[today] = { amount: amt, coins: cc, streak: next }; // lock the button right away, before the live data arrives
    snd("reward");
    if (window.EmpFx) EmpFx.show("promo", { title: "Check-in done!", sub: amt > 0 && cc > 0 ? "Plus " + cc + " coins. Added to your wallet." : "Your reward was added.", amount: amt > 0 ? amt : cc, prefix: amt > 0 ? "PKR " : "", suffix: amt > 0 ? "" : " coins" }); else say("Check-in done! Your reward was added.");
  } catch (e) {
    console.error("check-in failed:", e && e.code, e);
    bad(e && e.code === "permission-denied" ? "Check-in was blocked by the server rules. Please contact the admin." : "Couldn’t check in. Make sure your phone’s date and time are correct, then try again.");
  }
  claiming = false; drawCi();
}

async function syncClock() {
  try {
    const r = await fetch(location.origin + "/", { method: "HEAD", cache: "no-store" }), d = Date.parse(r.headers.get("date") || "");
    if (d) { const k = d - Date.now(); skew = Math.abs(k) < 36 * 3600e3 ? k : 0; }
  } catch (e) {}
}

export function startEarn(user) {
  stopEarn(); u = user; lastDay = pkt(nowMs());
  syncClock().then(() => { lastDay = pkt(nowMs()); drawCi(); drawTasks(); });
  if (!wired) {
    wired = true;
    document.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; drawTasks(); } });
    $("ciBtn").removeAttribute("data-t"); $("ciBtn").onclick = claim;
    const sh = $("rfShare"); sh.removeAttribute("data-t");
    sh.onclick = () => {
      const c = $("refCode").textContent; if (!c || c === "—") return;
      const url = location.origin + "/?ref=" + c;
      if (navigator.share) navigator.share({ title: "EARN MAX PK", text: "Join EARN MAX PK with my code " + c, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say("Referral link copied."), () => say(url));
      else say(url);
    };
  }
  const er = () => {};
  stops.push(F.onSnapshot(F.doc(db, "settings", "rewards"), s => { rewards = s.data() || null; drawCi(); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "tasks"), F.where("active", "==", true)), s => { tasks = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt ? a.createdAt.seconds : 0) - (b.createdAt ? b.createdAt.seconds : 0)); drawTasks(); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "submissions"), F.where("uid", "==", u.uid), F.limit(300)), s => { subs = s.docs.map(d => d.data()); drawTasks(); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "users", u.uid, "checkins"), F.orderBy(F.documentId(), "desc"), F.limit(3)), s => { ci = {}; s.forEach(d => { ci[d.id] = d.data(); }); drawCi(); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "referrals"), F.where("referrerUid", "==", u.uid)), s => { ["rfTotal", "hmRef"].forEach(i => { if ($(i)) $(i).textContent = String(s.size); }); }, er));
  stops.push(F.onSnapshot(F.query(F.collection(db, "users", u.uid, "ledger"), F.where("type", "==", "referral")), s => { let t = 0; s.forEach(d => { t += d.data().amount; }); $("rfEarn").textContent = fmt(t); }, er));
  tm = setInterval(() => { const d = pkt(nowMs()); if (d !== lastDay) { lastDay = d; drawCi(); drawTasks(); } tickCi(); if (Object.values(playAt).some(p => p.at + p.secs * 1000 + 1500 > nowMs())) drawTasks(); }, 1000);
}
export function stopEarn() {
  stops.forEach(f => f()); stops = []; clearInterval(tm); u = null; rewards = null; tasks = []; subs = []; ci = {}; ready = {}; playAt = {};
  if ($("taskList")) drawTasks();
  ["rfTotal", "hmRef"].forEach(i => { if ($(i)) $(i).textContent = "—"; });
  if ($("rfEarn")) $("rfEarn").textContent = "PKR —";
}
