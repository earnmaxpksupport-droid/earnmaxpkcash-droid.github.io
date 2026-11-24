import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m), snd = n => window.Sfx && window.Sfx.play(n);
const bad = m => { say(m); snd("error"); };
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = n => "PKR " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const r2 = x => Math.round(x * 100) / 100;
const NAMES = { jazzcash: "JazzCash", easypaisa: "Easypaisa" };
const PILL = { pending: "p1", approved: "p2", rejected: "p3" };
let stops = [], u = null, wired = false, pay = null, rw = null, bal = 0, dep = [], wd = [];

function opts(sel, kind) {
  const list = Object.keys(NAMES).filter(k => pay && pay[k] && pay[k][kind] === true);
  sel.textContent = "";
  if (!list.length) { const o = mk("option", null, "No method available yet"); o.value = ""; sel.append(o); return; }
  list.forEach(k => { const o = mk("option", null, NAMES[k]); o.value = k; sel.append(o); });
}
function info() {
  const m = $("dpMethod").value, c = $("dpInfo");
  if (!m || !pay || !pay[m]) { c.hidden = true; return; }
  c.hidden = false; c.textContent = "";
  c.append(mk("small", "mute", "Send your payment to"), mk("br"), mk("b", null, NAMES[m] + " · " + (pay[m].number || "")), mk("br"), mk("small", "mute", pay[m].title || ""));
}
function note() {
  const m = rw && rw.minWithdraw, f = rw && rw.withdrawFee;
  $("wdNote").textContent = m > 0 ? "Minimum withdrawal: " + fmt(m) + (f > 0 ? ". Fee: " + f + "%" : "") + ". The amount is held while your request is Pending, and sent after the admin approves it." : "Withdrawals open once the admin sets a minimum amount.";
}
function drawReq() {
  const c = $("reqList"); if (!c._e) c._e = c.innerHTML;
  c.textContent = "";
  const l = [...dep.map(x => ({ ...x, k: "Deposit" })), ...wd.map(x => ({ ...x, k: "Withdrawal" }))].sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e9) - (a.createdAt ? a.createdAt.seconds : 9e9));
  if (!l.length) { c.innerHTML = c._e; return; }
  const card = mk("div", "card"); card.style.padding = "4px 14px";
  l.slice(0, 30).forEach(x => {
    const d = mk("div", "tx"), m = mk("div"); m.style.flex = "1";
    m.append(mk("b", null, x.k + " · " + (NAMES[x.method] || x.method)), mk("br"), mk("small", "mute", fmt(x.amount) + " · " + (x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toLocaleString() : "Just now")));
    if (x.status === "rejected" && x.reason) m.append(mk("br"), mk("small", "mute", "Reason: " + x.reason));
    d.append(m, mk("span", "pill " + (PILL[x.status] || "p1"), x.status)); card.append(d);
  });
  c.append(card);
}
async function submitDeposit() {
  const amount = r2(parseFloat($("dpAmt").value)), method = $("dpMethod").value, trx = $("dpTrx").value.toUpperCase().replace(/\s/g, ""), num = $("dpNum").value.trim();
  if (!method) return bad("No payment method is available yet.");
  if (!(amount >= 1 && amount <= 1000000)) return bad("Enter a valid amount.");
  if (!/^[A-Z0-9]{6,20}$/.test(trx)) return bad("Enter the Transaction ID from your payment receipt (6 to 20 letters or numbers).");
  if (!/^[0-9+ -]{7,20}$/.test(num)) return bad("Enter your account number.");
  const b = $("dpBtn"); b.disabled = true;
  try {
    const id = F.doc(F.collection(db, "deposits")).id, bt = F.writeBatch(db);
    bt.set(F.doc(db, "deposits", id), { uid: u.uid, userName: (u.displayName || "Member").slice(0, 60), amount, method, trxId: trx, senderNumber: num, status: "pending", createdAt: F.serverTimestamp() });
    bt.set(F.doc(db, "trxIds", method + "_" + trx), { uid: u.uid, depositId: id }); // one Transaction ID can be used only once
    await bt.commit(); snd("success"); if (window.EmpFx) EmpFx.show("deposit", { title: "Deposit request sent!", sub: "We’ll verify your payment and update you soon.", amount: amount, prefix: "PKR " }); else say("Deposit request sent. It stays Pending until an admin verifies your payment.");
    ["dpAmt", "dpTrx", "dpNum"].forEach(i => { $(i).value = ""; }); location.hash = "history";
  } catch (e) { bad(e.code === "permission-denied" ? "This Transaction ID was already used, or this method is closed. Please check and try again." : "Couldn’t send the request. Please try again."); }
  b.disabled = false;
}
async function submitWithdraw() {
  if (window.EmpLock && window.EmpLock.locked()) { window.EmpLock.open(); return; }
  const amount = r2(parseFloat($("wdAmt").value)), method = $("wdMethod").value, acc = $("wdNum").value.trim(), title = $("wdTitle").value.trim(), min = rw && rw.minWithdraw;
  if (!method) return bad("No withdrawal method is available yet.");
  if (!(min > 0)) return bad("Withdrawals open once the admin sets a minimum amount.");
  if (!(amount >= min)) return bad("The minimum withdrawal is " + fmt(min) + ".");
  if (amount > bal) return bad("You don’t have enough balance.");
  if (!/^[0-9+ -]{7,20}$/.test(acc)) return bad("Enter your account number.");
  if (title.length < 2) return bad("Enter the account title.");
  const b = $("wdBtn"); b.disabled = true;
  try {
    const id = F.doc(F.collection(db, "withdrawals")).id, bt = F.writeBatch(db);
    bt.set(F.doc(db, "withdrawals", id), { uid: u.uid, userName: (u.displayName || "Member").slice(0, 60), amount, method, account: acc, title, status: "pending", createdAt: F.serverTimestamp() });
    bt.update(F.doc(db, "wallets", u.uid), { balance: F.increment(-amount), pending: F.increment(amount), lastWd: id, updatedAt: F.serverTimestamp() });
    await bt.commit(); snd("success"); if (window.EmpFx) EmpFx.show("withdraw", { title: "Withdrawal requested!", sub: "Your request is with our team. The amount is held until it is approved.", amount: amount, prefix: "PKR " }); else say("Withdrawal request sent. The amount is held until an admin approves it.");
    ["wdAmt", "wdNum", "wdTitle"].forEach(i => { $(i).value = ""; }); location.hash = "history";
  } catch (e) { bad("Couldn’t send the request. Check your balance and try again."); }
  b.disabled = false;
}
export function startMoney(user) {
  stopMoney(); u = user;
  if (!wired) {
    wired = true;
    ["dpBtn", "wdBtn"].forEach(i => $(i).removeAttribute("data-t"));
    $("dpBtn").onclick = submitDeposit; $("wdBtn").onclick = submitWithdraw; $("dpMethod").onchange = info;
  }
  const er = () => {}, byU = c => F.query(F.collection(db, c), F.where("uid", "==", u.uid), F.limit(30));
  stops.push(F.onSnapshot(F.doc(db, "settings", "payments"), s => { pay = s.data() || null; opts($("dpMethod"), "deposit"); opts($("wdMethod"), "withdraw"); info(); }, er));
  stops.push(F.onSnapshot(F.doc(db, "settings", "rewards"), s => { rw = s.data() || null; note(); }, er));
  stops.push(F.onSnapshot(F.doc(db, "wallets", u.uid), s => { bal = (s.data() || {}).balance || 0; }, er));
  stops.push(F.onSnapshot(byU("deposits"), s => { dep = s.docs.map(d => d.data()); drawReq(); }, er));
  stops.push(F.onSnapshot(byU("withdrawals"), s => { wd = s.docs.map(d => d.data()); drawReq(); }, er));
}
export function stopMoney() { stops.forEach(f => f()); stops = []; u = null; dep = []; wd = []; bal = 0; if ($("reqList")) drawReq(); }
