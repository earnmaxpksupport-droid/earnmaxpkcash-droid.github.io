import { db, F } from "./firebase-auth.js";
// When the user opens the app, celebrate every approval that happened since their last visit
// (approved deposits, withdrawals, task and referral rewards). It also celebrates new ones live.
let u = null, stop = null, queue = [], playing = false, seenMs = 0;
const key = () => "emp-rw-seen-" + (u ? u.uid : "");
const ms = d => d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0;
const short = t => String(t || "").slice(0, 80);
function info(d) {
  const a = Number(d.amount) || 0, t = d.type || "";
  if (!d.by || d.by === u.uid || d.status === "rejected") return null;
  if (t === "deposit") return a > 0 ? { kind: "redeem", title: "Deposit approved!", sub: "Your balance was updated.", amount: a, prefix: "PKR " } : { kind: "task", title: "Withdrawal unlocked!", sub: "Your first deposit was verified. You can withdraw now." };
  if (t === "withdrawal") return a < 0 ? { kind: "withdraw", title: "Withdrawal approved!", sub: "Your money is on the way.", amount: -a, prefix: "PKR " } : null;
  if (t === "task") return a > 0 ? { kind: "promo", title: "Task approved!", sub: short(d.note) || "Your reward was added.", amount: a, prefix: "PKR " } : null;
  if (t === "referral") return a > 0 ? { kind: "promo", title: "Referral bonus!", sub: short(d.note) || "Your reward was added.", amount: a, prefix: "PKR " } : null;
  if (t === "coins") return a > 0 ? { kind: "redeem", title: "Coins redeemed!", sub: short(d.note), amount: a, prefix: "PKR " } : null;
  return null;
}
function next() {
  if (playing || !queue.length || !window.EmpFx) return;
  playing = true; const o = queue.shift();
  EmpFx.show(o.kind, Object.assign({}, o, { onClose: replaced => { playing = false; setTimeout(next, replaced ? 6000 : 450); } }));
}
export function startReward(user) {
  stopReward(); u = user;
  let stored = 0; try { stored = Number(localStorage.getItem(key())) || 0; } catch (e) {}
  seenMs = stored; let first = true;
  stop = F.onSnapshot(F.query(F.collection(db, "users", u.uid, "ledger"), F.orderBy("createdAt", "desc"), F.limit(10)), s => {
    const docs = s.docs.map(d => d.data()), newest = docs.reduce((m, d) => Math.max(m, ms(d)), 0);
    if (first) { first = false; if (!stored) { seenMs = newest || Date.now(); try { localStorage.setItem(key(), String(seenMs)); } catch (e) {} return; } } // first time on this phone: only the starting point
    const fresh = docs.filter(d => ms(d) > seenMs).sort((a, b) => ms(a) - ms(b)).slice(-5).map(info).filter(Boolean);
    if (newest > seenMs) { seenMs = newest; try { localStorage.setItem(key(), String(seenMs)); } catch (e) {} }
    if (fresh.length) { queue.push(...fresh); setTimeout(next, 900); }
  }, () => {});
}
export function stopReward() { if (stop) stop(); stop = null; u = null; queue = []; playing = false; }
