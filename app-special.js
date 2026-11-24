import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m), snd = n => window.Sfx && window.Sfx.play(n);
const bad = m => { say(m); snd("error"); };
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = n => "PKR " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const worth = o => [o.reward > 0 ? fmt(o.reward) : "", o.coins > 0 ? Number(o.coins).toLocaleString("en-PK") + " coins" : ""].filter(Boolean).join(" + ") || "—";
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)), p = n => String(n).padStart(2, "0"); return p(Math.floor(s / 3600)) + ":" + p(Math.floor(s % 3600 / 60)) + ":" + p(s % 60); };
let u = null, stops = [], specials = [], subs = [], subsLoaded = false, page = null, tm = null, open = false, cur = null, media = {};

{ const st = document.createElement("style"); st.textContent = `
@keyframes spxShine{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(220%) skewX(-20deg)}}
@keyframes spxPulse{0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.55)}50%{box-shadow:0 0 0 10px rgba(250,204,21,0)}}
@keyframes spxIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.spx-page{position:fixed;inset:0;z-index:60;background:var(--bg,#f1faf3);color:var(--ink,#0f2a1a);overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 90px;font-family:inherit;-webkit-tap-highlight-color:transparent}
.spx-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px}.spx-bar h2{margin:0;font-size:19px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spx-back{width:42px;height:42px;border-radius:14px;border:1px solid var(--line,#dcecdf);background:var(--card,#fff);color:inherit;font-size:22px;font-weight:700;box-shadow:0 4px 12px rgba(10,92,40,.08)}
.spx-hero{position:relative;overflow:hidden;border-radius:26px;padding:20px;color:#fff;background:linear-gradient(135deg,#052e16,#0a5c28 55%,#16a34a);box-shadow:0 14px 30px rgba(10,92,40,.28);margin-bottom:16px;animation:spxIn .4s both}
.spx-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,.35),transparent 70%)}
.spx-hero h1{margin:0;font-size:24px;line-height:1.2}.spx-hero p{margin:6px 0 0;opacity:.88;font-size:14px;line-height:1.45}
.spx-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.spx-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:99px;font-size:12.5px;font-weight:800;background:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(4px)}
.spx-pill.gold{background:linear-gradient(135deg,#fde68a,#facc15);color:#713f12}
.spx-item{display:flex;align-items:center;gap:14px;padding:14px;margin-bottom:12px;border-radius:22px;background:var(--card,#fff);border:1px solid var(--line,#dcecdf);box-shadow:0 8px 22px rgba(10,92,40,.10);cursor:pointer;animation:spxIn .45s both;transition:transform .15s}.spx-item:active{transform:scale(.98)}
.spx-ico{width:62px;height:62px;border-radius:18px;flex:none;display:grid;place-items:center;font-size:30px;background:linear-gradient(135deg,#ede9fe,#f5d0fe);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(124,58,237,.15)}.spx-ico img{width:100%;height:100%;object-fit:cover}
.spx-info{flex:1;min-width:0}.spx-info b{display:block;font-size:16px;line-height:1.25}
.spx-chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.spx-chip{padding:3px 9px;border-radius:99px;font-size:11.5px;font-weight:800;background:#ede9fe;color:#5b21b6}.spx-chip.g{background:#dcfce7;color:#166534}.spx-chip.y{background:#fef3c7;color:#92400e}.spx-chip.r{background:#ffedd5;color:#9a3412}
.spx-win{font-size:13.5px;font-weight:800;color:var(--g2,#16a34a)}
.spx-go{flex:none;min-height:40px;padding:0 14px;border-radius:14px;border:0;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#7c3aed,#c026d3);box-shadow:0 6px 14px rgba(124,58,237,.35)}
.spx-card{background:var(--card,#fff);border:1px solid var(--line,#dcecdf);border-radius:22px;padding:16px;margin-bottom:14px;box-shadow:0 8px 22px rgba(10,92,40,.08);animation:spxIn .4s both}
.spx-card h3{margin:0 0 10px;font-size:16px}.spx-m{color:var(--mute,#5f7d6a);font-size:13.5px;line-height:1.5}
.spx-cta{position:relative;overflow:hidden;width:100%;min-height:54px;border:0;border-radius:18px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,#16a34a,#0a5c28);box-shadow:0 10px 22px rgba(10,92,40,.35);animation:spxPulse 2s infinite}
.spx-cta:disabled{opacity:.55;animation:none}.spx-cta:before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:spxShine 3s infinite}
.spx-cta.o{background:transparent;color:var(--g2,#16a34a);border:2px solid var(--g2,#16a34a);box-shadow:none;animation:none}.spx-cta.o:before{display:none}
.spx-step{display:flex;gap:12px;align-items:center;padding:8px 0}.spx-num{width:30px;height:30px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:900;font-size:14px;color:#fff;background:linear-gradient(135deg,#7c3aed,#c026d3)}
.spx-lvl{display:flex;align-items:center;gap:12px;padding:12px;margin-top:10px;border-radius:18px;background:linear-gradient(135deg,rgba(250,204,21,.12),rgba(250,204,21,.03));border:1px solid rgba(250,204,21,.45)}
.spx-medal{width:46px;height:46px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 4px 10px rgba(245,158,11,.4)}
.spx-lvl .t{flex:1;min-width:0}.spx-lvl b{display:block;font-size:15px}.spx-lvl .p{margin-top:3px;font-weight:900;color:#b45309;font-size:14px}
.spx-b{min-height:40px;padding:0 14px;border-radius:13px;border:0;background:linear-gradient(180deg,#22c55e,#0a5c28);color:#fff;font-weight:800;font-size:13.5px;flex:none}.spx-b:disabled{opacity:.55}
.spx-lock{margin-top:14px;padding:14px;border-radius:18px;background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#9a3412;text-align:center;font-weight:900;font-size:16px;line-height:1.5;border:1px solid #fdba74}.spx-lock small{display:block;font-weight:600;font-size:13px}
.spx-gal{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;margin:0 -4px}.spx-gal img{flex:none;width:62%;max-width:260px;border-radius:16px;scroll-snap-align:center;box-shadow:0 8px 20px rgba(0,0,0,.18);background:#ddd}
.spx-ov{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px}.spx-dlg{width:100%;max-width:420px;max-height:88vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#0f2a1a);border-radius:24px;padding:18px;animation:spxIn .25s both}
.spx-dlg img{width:100%;border-radius:14px;margin-top:10px}
.spx-home{position:relative;overflow:hidden}.spx-home:before{content:"";position:absolute;top:0;bottom:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:spxShine 3.2s infinite}`; document.head.appendChild(st); }

// ---- how long the link stays open: kept on the phone so it survives the app being closed ----
const pre = () => "emp-sp-" + u.uid + "-";
const getS = id => { try { return JSON.parse(localStorage.getItem(pre() + id) || "null"); } catch (e) { return null; } };
const setS = (id, s) => { try { localStorage.setItem(pre() + id, JSON.stringify(s)); } catch (e) {} };
function reconcile(hidden) {
  if (!u) return; const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i); if (!k || k.indexOf(pre()) !== 0) continue; const id = k.slice(pre().length), s = getS(id); if (!s || !s.first) continue;
    if (hidden) { if (s.left == null) { s.left = now; setS(id, s); } } else if (s.left != null) { s.away = (s.away || 0) + (now - s.left); s.left = null; s.back = now; setS(id, s); }
  }
}
document.addEventListener("visibilitychange", () => reconcile(document.hidden));
addEventListener("pageshow", () => { if (!document.hidden) reconcile(false); });

const subId = (sp, tier, rnd) => u.uid + "_" + sp.id + (rnd > 0 ? "_r" + rnd : "") + (sp.kind === "game" ? "_t" + tier : "_x");
const subOf = (sp, tier, rnd) => subs.find(x => x.id === subId(sp, tier, rnd));
// After "cooldownAfter" submissions the task locks for "cooldownHours"; then a new round starts.
function info(sp) {
  const after = sp.cooldownAfter | 0, mine = subs.filter(x => x.specialId === sp.id), rnd = mine.reduce((m, x) => Math.max(m, x.round || 0), 0), cur = mine.filter(x => (x.round || 0) === rnd);
  if (after > 0 && cur.length >= after) {
    const last = Math.max(...cur.map(x => x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now())), until = last + (sp.cooldownHours || 24) * 3600e3;
    if (Date.now() < until) return { round: rnd, locked: true, until, count: cur.length, cur };
    return { round: rnd + 1, locked: false, count: 0, cur: [] };
  }
  return { round: rnd, locked: false, count: cur.length, cur };
}
const waitLeft = sp => { const s = getS(sp.id); return s && s.first ? Math.max(0, Math.ceil((s.first + (sp.minSecs || 0) * 1000 - Date.now()) / 1000)) : 0; };
function play(sp) {
  const s = getS(sp.id) || { opens: 0, first: Date.now(), away: 0, left: null, back: null }; s.rnd = info(sp).round;
  s.opens = (s.opens || 0) + 1; if (!s.first) s.first = Date.now(); setS(sp.id, s);
  window.open(sp.link, "_blank", "noopener");
  say(sp.minSecs > 0 ? "Play for at least " + sp.minSecs + " seconds, then come back." : "Finish it, then come back."); render();
}
function shrinkImg(file, max, q) {
  return new Promise((res, rej) => {
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); let o = c.toDataURL("image/webp", q); if (o.indexOf("data:image/webp") !== 0) o = c.toDataURL("image/jpeg", q); res(o); };
    im.onerror = rej; im.src = url;
  });
}
// ---- submit (with a screenshot when the task asks for one) ----
function submitFlow(sp, tier, rnd) {
  const g = sp.kind === "game", tr = g ? sp.tiers[tier] : sp, needShot = g || !!sp.needShot, ov = mk("div", "spx-ov"), d = mk("div", "spx-dlg"), file = mk("input"), prev = mk("img");
  d.append(mk("h3", null, "🏆 " + sp.title)); const bx = mk("div", "spx-lvl"), md = mk("div", "spx-medal", "🎁"), t = mk("div", "t"); t.append(mk("b", null, (g ? "Score " + tr.score + " " + (sp.scoreLabel || "") : "Your reward")), mk("div", "p", worth(tr))); bx.append(md, t); d.append(bx);
  if (needShot) { d.append(mk("p", "spx-m", "Upload a screenshot that shows " + (g ? "your " + (sp.scoreLabel || "score") + "." : "that you finished.") + " Then wait for the admin to approve it.")); file.type = "file"; file.accept = "image/*"; file.style.margin = "8px 0"; prev.hidden = true; file.onchange = () => { const f = file.files[0]; if (f) { prev.src = URL.createObjectURL(f); prev.hidden = false; } }; d.append(file, prev); }
  const row = mk("div"), go = mk("button", "spx-cta", "Submit for approval"), no = mk("button", "spx-cta o", "Cancel"); row.style.cssText = "display:grid;gap:10px;margin-top:16px"; no.onclick = () => ov.remove();
  go.onclick = async () => {
    if (needShot && !file.files[0]) return bad("Please choose a screenshot first.");
    go.disabled = true; go.textContent = "Sending…";
    try {
      const id = subId(sp, tier, rnd), now = Date.now(), st = getS(sp.id) || {}, away = (st.away || 0) + (st.left != null ? now - st.left : 0), first = st.first || now, bt = F.writeBatch(db);
      let shot = null; if (needShot) { shot = await shrinkImg(file.files[0], 900, .6); if (shot.length > 380000) shot = await shrinkImg(file.files[0], 700, .4); if (shot.length > 390000) throw new Error("big"); }
      if (shot) bt.set(F.doc(db, "specialShots", id), { uid: u.uid, shot, createdAt: F.serverTimestamp() });
      bt.set(F.doc(db, "specialSubs", id), { uid: u.uid, specialId: sp.id, title: sp.title, kind: sp.kind || "link", ...(g ? { tier, score: tr.score } : {}), ...(rnd > 0 ? { round: rnd } : {}), reward: tr.reward || 0, coins: tr.coins || 0, userName: u.displayName || "Member", userEmail: u.email || "", status: "pending", hasShot: !!shot,
        track: { opens: Math.max(1, st.opens || 1), firstAt: first, awayMs: Math.round(away), backAt: st.back || now, afterMs: Math.round(now - first), need: sp.minSecs || 0, device: (navigator.userAgent || "").slice(0, 100) }, createdAt: F.serverTimestamp() });
      await bt.commit(); { const z = getS(sp.id) || st; z.had = true; z.rnd = rnd; setS(sp.id, z); } ov.remove(); snd("success"); if (window.EmpFx) EmpFx.show("task", { title: "Submitted!", sub: "Please wait for the admin to approve it." }); else say("Submitted. Please wait for the admin to approve it.");
    } catch (e) { go.disabled = false; go.textContent = "Submit for approval"; bad(e && e.message === "big" ? "That picture is too big. Try a smaller screenshot." : "Couldn’t submit. Please try again."); }
  };
  row.append(go, no); d.append(row); ov.append(d); document.body.append(ov);
}
function btnFor(sp, tier, label, inf, ordered) {
  const sub = subOf(sp, tier, inf.round), b = mk("button", "spx-b"), s = getS(sp.id), w = waitLeft(sp);
  if (sub) { b.textContent = sub.status === "approved" ? "Paid ✓" : "In review ⏳"; b.disabled = true; }
  else if (inf.locked || ordered) { b.textContent = "Locked 🔒"; b.disabled = true; }
  else if (!s || !s.opens) { b.textContent = "Play first"; b.disabled = true; }
  else if (w > 0) { b.textContent = "Wait " + w + "s"; b.disabled = true; }
  else { b.textContent = label; b.onclick = () => submitFlow(sp, tier, inf.round); }
  return b;
}
// ---- pages ----
const best = sp => sp.kind === "game" ? (sp.tiers || []).reduce((m, t) => ({ reward: Math.max(m.reward, t.reward || 0), coins: Math.max(m.coins, t.coins || 0) }), { reward: 0, coins: 0 }) : { reward: sp.reward || 0, coins: sp.coins || 0 };
function iconEl(sp, cls) { const ic = mk("div", cls); if (sp.icon && sp.icon.indexOf("data:") === 0) { const i = mk("img"); i.src = sp.icon; i.alt = ""; ic.append(i); } else ic.textContent = sp.icon || (sp.kind === "game" ? "🎮" : "⭐"); return ic; }
function renderList(body) {
  const hero = mk("div", "spx-hero"), tot = specials.reduce((s, sp) => s + best(sp).reward, 0);
  hero.append(mk("h1", null, "⭐ Special tasks"), mk("p", null, "Play games, hit big scores and win PKR and coins."));
  const pl = mk("div", "spx-pills"); pl.append(mk("span", "spx-pill", specials.length + " task" + (specials.length === 1 ? "" : "s"))); if (tot > 0) pl.append(mk("span", "spx-pill gold", "Win up to " + fmt(tot))); hero.append(pl); body.append(hero);
  if (!specials.length) { const e = mk("div", "spx-card"); e.style.textAlign = "center"; e.append(mk("div", null, "⭐"), mk("div", "spx-m", "No special tasks right now. Check back soon.")); body.append(e); return false; }
  let wait = false;
  specials.forEach((sp, i) => {
    const inf = info(sp), g = sp.kind === "game", card = mk("div", "spx-item"), mid = mk("div", "spx-info"), ch = mk("div", "spx-chips"), b = best(sp), n = (sp.tiers || []).length;
    card.style.animationDelay = i * 60 + "ms"; mid.append(mk("b", null, sp.title)); ch.append(mk("span", "spx-chip", g ? "🎮 Game" : "🔗 Task"));
    if (inf.locked) { ch.append(mk("span", "spx-chip r", "⏳ " + hms(inf.until - Date.now()))); wait = true; }
    else { const paid = inf.cur.filter(x => x.status === "approved").length, rev = inf.cur.filter(x => x.status === "pending").length; if (g && inf.cur.length) ch.append(mk("span", "spx-chip g", inf.cur.length + "/" + n + " done")); if (rev) ch.append(mk("span", "spx-chip y", rev + " in review")); if (!g && paid) ch.append(mk("span", "spx-chip g", "Paid ✓")); }
    mid.append(ch, mk("div", "spx-win", (g ? "Win up to " : "Earn ") + worth(b)));
    const go = mk("button", "spx-go", "Open ›"); card.append(iconEl(sp, "spx-ico"), mid, go); card.onclick = () => openDetail(sp.id); body.append(card);
  });
  return wait;
}
function renderDetail(body, sp) {
  const inf = info(sp), g = sp.kind === "game", s0 = getS(sp.id); let s = s0, wait = false;
  if (s && ((s.rnd || 0) !== inf.round || (s.had && subsLoaded && !subs.some(x => x.specialId === sp.id)))) { try { localStorage.removeItem(pre() + sp.id); } catch (e) {} s = null; }
  const hero = mk("div", "spx-hero"), row = mk("div"), t = mk("div"); row.style.cssText = "display:flex;gap:14px;align-items:center"; const ic = iconEl(sp, "spx-ico"); ic.style.width = ic.style.height = "72px"; t.append(mk("h1", null, sp.title)); row.append(ic, t); hero.append(row);
  if (sp.instructions) hero.append(mk("p", null, sp.instructions));
  const pl = mk("div", "spx-pills"); pl.append(mk("span", "spx-pill", g ? "🎮 Game" : "🔗 Task")); if (sp.minSecs > 0) pl.append(mk("span", "spx-pill", "⏱ Play " + sp.minSecs + "s")); pl.append(mk("span", "spx-pill gold", (g ? "Win up to " : "Earn ") + worth(best(sp)))); hero.append(pl); body.append(hero);
  const act = mk("div", "spx-card"), pb = mk("button", "spx-cta" + (s && s.opens ? " o" : ""), s && s.opens ? "▶ Play again" : (g ? "▶ Play now" : "▶ Open & play")); pb.onclick = () => play(sp); pb.disabled = inf.locked; act.append(pb);
  if (s && s.opens) act.append(mk("div", "spx-m", "You opened it " + s.opens + " time" + (s.opens > 1 ? "s" : "") + "." + (waitLeft(sp) > 0 ? " Keep playing, Submit unlocks in " + waitLeft(sp) + "s." : ""))); if (s && s.opens && waitLeft(sp) > 0) wait = true;
  if (inf.locked) { const lk = mk("div", "spx-lock"); lk.append(mk("div", null, "⏳ New rewards unlock in " + hms(inf.until - Date.now())), mk("small", null, "You finished " + inf.count + " reward" + (inf.count > 1 ? "s" : "") + ". Come back when the timer ends.")); act.append(lk); wait = true; }
  body.append(act);
  const how = mk("div", "spx-card"); how.append(mk("h3", null, "How it works"));
  (g ? ["Tap Play now and play the game", "Reach one of the scores below", "Upload a screenshot of your score", "Get paid after the admin approves"] : ["Tap Open & play" + (sp.minSecs > 0 ? " and stay " + sp.minSecs + " seconds" : ""), sp.needShot ? "Upload a screenshot as proof" : "Come back and tap Submit", "Get paid after the admin approves"]).forEach((x, i) => { const r = mk("div", "spx-step"); r.append(mk("span", "spx-num", String(i + 1)), mk("span", null, x)); how.append(r); }); body.append(how);
  const rw = mk("div", "spx-card");
  if (g) { rw.append(mk("h3", null, "Score rewards")); (sp.tiers || []).forEach((tr, i) => { const ok = i === 0 || !!subOf(sp, i - 1, inf.round), l = mk("div", "spx-lvl"), md = mk("div", "spx-medal", ["🥉", "🥈", "🥇", "🏆", "💎"][Math.min(i, 4)]), tx = mk("div", "t"); tx.append(mk("b", null, "Reach " + Number(tr.score).toLocaleString("en-PK") + " " + (sp.scoreLabel || "score")), mk("div", "p", worth(tr))); if (!ok && !subOf(sp, i, inf.round)) { l.style.opacity = ".65"; tx.append(mk("div", "spx-m", "Submit level " + i + " first to unlock")); } l.append(md, tx, btnFor(sp, i, "I reached this", inf, !ok)); rw.append(l); }); }
  else { rw.append(mk("h3", null, "Your reward")); const l = mk("div", "spx-lvl"), md = mk("div", "spx-medal", "🎁"), tx = mk("div", "t"); tx.append(mk("b", null, "Complete this task"), mk("div", "p", worth(sp))); l.append(md, tx, btnFor(sp, -1, "Submit", inf)); rw.append(l); }
  body.append(rw);
  if (sp.hasMedia) {
    const gal = mk("div", "spx-card"); gal.append(mk("h3", null, "Screenshots"));
    const m = media[sp.id];
    if (!m) { gal.append(mk("div", "spx-m", "Loading screenshots…")); F.getDoc(F.doc(db, "specialMedia", sp.id)).then(d => { media[sp.id] = (d.data() || {}).shots || []; if (cur === sp.id) render(); }).catch(() => { media[sp.id] = []; }); }
    else if (m.length) { const r = mk("div", "spx-gal"); m.forEach(src => { const i = mk("img"); i.src = src; i.alt = ""; i.loading = "lazy"; i.onclick = () => { const ov = mk("div", "spx-ov"), im = mk("img"); im.src = src; im.style.cssText = "max-height:88vh;max-width:100%;border-radius:14px"; ov.append(im); ov.onclick = () => ov.remove(); document.body.append(ov); }; r.append(i); }); gal.append(r); }
    else gal.hidden = true;
    body.append(gal);
  }
  return wait;
}
// ---- optional ad of a special task / mini game (set by the admin on the task form) ----
const adClamp = (v, lo, hi, d) => { const n = parseInt(v, 10); return n >= lo && n <= hi ? n : d; };
function runAdScripts(code, id) {
  try { const k = "emp_sa_" + id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
  const t = document.createElement("template"); t.innerHTML = code;
  [].forEach.call(t.content.querySelectorAll("script"), o => { const s = document.createElement("script"); [].forEach.call(o.attributes, a => { try { s.setAttribute(a.name, a.value); } catch (e) {} }); if (o.textContent) s.text = o.textContent; document.body.appendChild(s); });
}
// Built once per task (render() runs every second while waiting, and a rebuilt frame would reload the ad each time)
function syncAd(sp) {
  const host = $("spxAd"); if (!host) return;
  const code = sp && typeof sp.adCode === "string" ? sp.adCode.trim() : "";
  if (!code || code.length > 6000) { if (host._sig) { host.textContent = ""; host._sig = ""; } return; }
  const kind = sp.adKind === "script" ? "script" : "banner", w = adClamp(sp.adW, 100, 1000, 300), h = adClamp(sp.adH, 30, 1000, 250), sig = sp.id + "|" + kind + "|" + code + "|" + w + "|" + h;
  if (host._sig === sig) return; host._sig = sig; host.textContent = "";
  if (kind === "script") return runAdScripts(code, sp.id);
  if (window.innerWidth < w + 32) return;
  const card = mk("div", "spx-card"), l = mk("div", "spx-m", "Advertisement"), f = document.createElement("iframe");
  card.style.textAlign = "center"; l.style.fontSize = "11px"; l.style.marginBottom = "6px";
  f.width = w; f.height = h; f.setAttribute("scrolling", "no"); f.setAttribute("title", "Advertisement"); f.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms");
  f.style.cssText = "border:0;width:" + w + "px;height:" + h + "px;max-width:100%";
  f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:transparent">' + code + '</body></html>';
  card.append(l, f); host.append(card);
}
function render() {
  clearTimeout(tm); if (!page) return; const body = $("spxBody"); if (!body) return; const top = page.scrollTop; body.textContent = "";
  const sp = cur && specials.find(x => x.id === cur); if (cur && !sp) cur = null;
  $("spxTitle").textContent = sp ? sp.title : "Special tasks";
  const wait = sp ? renderDetail(body, sp) : renderList(body); syncAd(sp); page.scrollTop = top;
  if (wait) tm = setTimeout(render, 1000);
}
function openDetail(id) { cur = id; history.pushState({ sp: 2 }, "", location.href); page.scrollTop = 0; render(); }
function openPage() {
  if (page || !u) return;
  page = mk("div", "spx-page"); const bar = mk("div", "spx-bar"), back = mk("button", "spx-back", "‹"), h = mk("h2", null, "Special tasks"); h.id = "spxTitle";
  back.onclick = () => { if (cur) history.back(); else closePage(false); };
  const sp = mk("span"); sp.style.width = "42px"; bar.append(back, h, sp); const body = mk("div"); body.id = "spxBody"; const adh = mk("div"); adh.id = "spxAd"; const dh = mk("div"); dh.id = "spxDirect"; page.append(bar, body, adh, dh); document.body.append(page); history.pushState({ sp: 1 }, "", location.href); open = true; cur = null; render(); try { window.dispatchEvent(new Event("emp-page")); } catch (e) {}
}
function closePage(fromPop) { if (!page) return; clearTimeout(tm); page.remove(); page = null; cur = null; if (open && !fromPop && history.state && history.state.sp) history.back(); open = false; }
addEventListener("popstate", () => { if (!open) return; if (cur) { cur = null; render(); } else { open = false; closePage(true); } });
// ---- the Special task card on the home screen ----
function mount() {
  if ($("spxHome")) return; const home = document.querySelector('[data-s="home"]'), chk = home && home.querySelector(".chk"); if (!home || !chk) return;
  const c = mk("div", "chk spx-home"), t = mk("div"), b = mk("button", "btn y", "Open"); c.id = "spxHome"; c.style.cssText += "background:linear-gradient(135deg,#1e1b4b,#6d28d9 55%,#c026d3);margin-top:12px;cursor:pointer";
  const ic = mk("div", null, "⭐"); ic.style.cssText = "font-size:34px;line-height:1"; t.append(mk("b", null, "Special task"), mk("br")); const sm = mk("small", null, "Play games and earn big rewards"); sm.id = "spxSub"; sm.style.color = "#f3e8ff"; t.append(sm);
  b.onclick = e => { e.stopPropagation(); openPage(); }; c.onclick = openPage; c.append(ic, t, b); chk.after(c);
}
function sub() { const e = $("spxSub"); if (e) e.textContent = specials.length ? specials.length + " special task" + (specials.length > 1 ? "s" : "") + " waiting for you" : "Play games and earn big rewards"; }
export function startSpecial(user) {
  stopSpecial(); u = user; mount(); reconcile(false);
  stops.push(F.onSnapshot(F.query(F.collection(db, "specials"), F.where("active", "==", true)), s => { specials = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt ? a.createdAt.seconds : 9e12) - (b.createdAt ? b.createdAt.seconds : 9e12)); sub(); render(); }, () => {}));
  stops.push(F.onSnapshot(F.query(F.collection(db, "specialSubs"), F.where("uid", "==", u.uid)), s => { subs = s.docs.map(d => ({ id: d.id, ...d.data() })); subsLoaded = true; render(); }, () => {}));
}
export function stopSpecial() { stops.forEach(f => f()); stops = []; clearTimeout(tm); if (page) { page.remove(); page = null; open = false; } cur = null; media = {}; const h = $("spxHome"); if (h) h.remove(); u = null; specials = []; subs = []; subsLoaded = false; }
