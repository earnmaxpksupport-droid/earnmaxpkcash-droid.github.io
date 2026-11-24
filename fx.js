// Celebration animations: EmpFx.show(kind, { title, sub, amount, prefix, suffix })
// kinds: deposit, withdraw, win, bigwin, promo, redeem, task
(function () {
  var st = document.createElement("style");
  st.textContent = ".fx-ov{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:rgba(8,20,14,.66);backdrop-filter:blur(3px);animation:fxIn .25s ease both;overflow:hidden}.fx-ov.out{animation:fxOut .3s ease both}"
  + ".fx-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}"
  + ".fx-card{position:relative;width:min(86vw,340px);background:#fff;color:#0f2a1a;border-radius:28px;padding:26px 20px 20px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:fxPop .6s cubic-bezier(.2,1.4,.4,1) both}"
  + ".fx-ov.big .fx-card{animation:fxPop .6s cubic-bezier(.2,1.4,.4,1) both,fxShake .6s .55s ease}"
  + ".fx-ic{position:relative;width:96px;height:96px;margin:0 auto;display:grid;place-items:center;font-size:56px}"
  + ".fx-ic svg{width:96px;height:96px;overflow:visible}.fx-c{stroke-dasharray:152;stroke-dashoffset:152;animation:fxDraw .6s .15s ease forwards}.fx-p{stroke-dasharray:44;stroke-dashoffset:44;animation:fxDraw .4s .65s ease forwards}"
  + ".fx-coin{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;font-size:44px;font-weight:900;color:#92400e;background:radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#d97706);border:4px solid #b45309;box-shadow:0 0 0 6px rgba(251,191,36,.35),0 0 30px rgba(251,191,36,.9);animation:fxSpin 1.4s ease-in-out infinite}"
  + ".fx-ring{position:absolute;left:50%;top:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;border:3px solid #fbbf24;opacity:0;animation:fxRing 1.6s ease-out infinite}.fx-ring:nth-child(2){animation-delay:.5s}.fx-ring:nth-child(3){animation-delay:1s}"
  + ".fx-em{animation:fxBounce .9s .2s cubic-bezier(.3,1.6,.5,1) both;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25))}"
  + ".fx-t{font-size:25px;font-weight:900;margin:14px 0 2px;animation:fxUp2 .5s .3s both}.fx-ov.big .fx-t{font-size:32px;background:linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fxUp2 .5s .3s both,fxShine 1.4s linear infinite}"
  + ".fx-a{font-size:42px;font-weight:900;color:#16a34a;margin:2px 0;animation:fxUp2 .5s .45s both;font-variant-numeric:tabular-nums}.fx-s{font-size:14px;opacity:.75;margin:0 0 16px;animation:fxUp2 .5s .55s both}"
  + ".fx-ok{background:linear-gradient(#fcd34d,#f59e0b);border:0;border-radius:99px;padding:12px 36px;font-weight:900;font-size:16px;color:#3b2a00;box-shadow:0 5px 0 #b45309;animation:fxUp2 .5s .65s both}"
  + ".fx-fl{position:absolute;bottom:-40px;font-size:30px;opacity:0;animation:fxFloat 2.8s ease-in forwards;pointer-events:none}"
  + "@keyframes fxIn{from{opacity:0}to{opacity:1}}@keyframes fxOut{to{opacity:0}}@keyframes fxPop{0%{transform:scale(.3) translateY(40px);opacity:0}100%{transform:none;opacity:1}}"
  + "@keyframes fxDraw{to{stroke-dashoffset:0}}@keyframes fxSpin{0%,100%{transform:rotateY(0)}50%{transform:rotateY(180deg)}}@keyframes fxRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.6);opacity:0}}"
  + "@keyframes fxBounce{0%{transform:scale(0) rotate(-30deg)}100%{transform:scale(1) rotate(0)}}@keyframes fxUp2{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}"
  + "@keyframes fxShake{0%,100%{transform:none}20%{transform:translateX(-7px) rotate(-1deg)}40%{transform:translateX(7px) rotate(1deg)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}@keyframes fxShine{to{background-position:-200% 0}}"
  + "@keyframes fxFloat{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(-105vh) rotate(25deg);opacity:0}}"
  + "@media(prefers-reduced-motion:reduce){.fx-ov *{animation-duration:.01s!important;animation-delay:0s!important}}";
  document.head.appendChild(st);

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CHECK = '<svg viewBox="0 0 52 52"><circle class="fx-c" cx="26" cy="26" r="24" fill="none" stroke="#22c55e" stroke-width="3"/><path class="fx-p" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 27l8 8 16-17"/></svg>';
  var P = {
    deposit: { ic: "check", col: ["#22c55e", "#3b82f6", "#a7f3d0", "#fde68a", "#60a5fa"], ms: 4300, conf: 90, coin: 0, fl: ["💵", "💸"] },
    withdraw: { ic: "check", col: ["#f59e0b", "#22c55e", "#fde68a", "#34d399", "#fbbf24"], ms: 4300, conf: 80, coin: 14, fl: ["💰", "💵"] },
    win: { ic: "coin", col: ["#fbbf24", "#f59e0b", "#a78bfa", "#34d399", "#f472b6"], ms: 3900, conf: 70, coin: 34, fl: [] },
    bigwin: { ic: "coin", ring: 1, big: 1, col: ["#fbbf24", "#ef4444", "#a78bfa", "#22c55e", "#3b82f6", "#f472b6"], ms: 5400, conf: 150, coin: 90, fl: ["⭐"] },
    promo: { ic: "🎁", col: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"], ms: 4300, conf: 140, coin: 0, fl: ["⭐"] },
    redeem: { ic: "💵", col: ["#22c55e", "#fbbf24", "#86efac", "#fde68a"], ms: 4500, conf: 70, coin: 60, fl: ["💵"] },
    task: { ic: "check", col: ["#22c55e", "#fbbf24", "#60a5fa", "#f472b6"], ms: 3700, conf: 80, coin: 8, fl: ["⭐"] }
  };
  var cur = null;

  function engine(cv, p) {
    var ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, ps = [], t0 = performance.now(), last = t0, raf = 0, dead = false;
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size();
    var rnd = function (a, b) { return a + Math.random() * (b - a); }, pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    function burst(x, y, n, spread) { for (var i = 0; i < n; i++) ps.push({ k: "c", x: x, y: y, vx: rnd(-spread, spread), vy: rnd(-15, -5), g: .32, w: rnd(6, 12), h: rnd(4, 8), r: rnd(0, 6.3), vr: rnd(-.4, .4), col: pick(p.col) }); }
    function coin() { ps.push({ k: "k", x: rnd(10, W - 10), y: -24, vx: rnd(-1, 1), vy: rnd(2, 5), g: .1, s: rnd(9, 17), a: rnd(0, 6.3), va: rnd(.12, .3) }); }
    burst(W * .5, H * .55, p.conf * .4, 9); burst(0, H * .85, p.conf * .3, 8); burst(W, H * .85, p.conf * .3, 8);
    var later = setTimeout(function () { burst(W * .5, H * .4, p.conf * .4, 11); }, 700);
    function draw(q) {
      ctx.save(); ctx.translate(q.x, q.y);
      if (q.k === "c") { ctx.rotate(q.r); ctx.fillStyle = q.col; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); }
      else { ctx.scale(Math.cos(q.a), 1); var g = ctx.createRadialGradient(-q.s * .3, -q.s * .3, 1, 0, 0, q.s); g.addColorStop(0, "#fff7c2"); g.addColorStop(.6, "#fbbf24"); g.addColorStop(1, "#d97706"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.s, 0, 6.3); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#b45309"; ctx.stroke(); ctx.fillStyle = "#b45309"; ctx.font = "900 " + Math.round(q.s * 1.1) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", 0, 1); }
      ctx.restore();
    }
    function frame(now) {
      if (dead) return; var dt = Math.min(2, (now - last) / 16.7); last = now;
      var el = now - t0; if (p.coin && el < p.ms * .65 && Math.random() < p.coin / 55) coin();
      ctx.clearRect(0, 0, W, H);
      for (var i = ps.length - 1; i >= 0; i--) { var q = ps[i]; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === "c") { q.r += q.vr * dt; q.vx *= .992; } else q.a += q.va * dt; if (q.y > H + 40) ps.splice(i, 1); else draw(q); }
      if (el < p.ms + 1500) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { dead = true; clearTimeout(later); cancelAnimationFrame(raf); };
  }

  function count(el, to, pre, suf) {
    var dur = 1100, t0 = performance.now(), whole = Math.abs(to - Math.round(to)) < .001, fmt = function (v) { return pre + (whole ? Math.round(v) : Math.round(v * 100) / 100).toLocaleString("en-PK") + suf; };
    if (reduce) { el.textContent = fmt(to); return; }
    (function f(now) { var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(f); })(t0);
  }

  function close() {
    if (!cur) return; var c = cur; cur = null; clearTimeout(c.timer); if (c.stop) c.stop();
    c.ov.classList.add("out"); setTimeout(function () { c.ov.remove(); }, 300);
    if (c.onClose) try { c.onClose(false); } catch (e) {}
  }
  function show(kind, o) {
    o = o || {}; var p = P[kind] || P.task;
    if (cur) { var old = cur; cur = null; clearTimeout(old.timer); if (old.stop) old.stop(); old.ov.remove(); if (old.onClose) try { old.onClose(true); } catch (e) {} }
    var ov = document.createElement("div"); ov.className = "fx-ov" + (p.big ? " big" : ""); ov.setAttribute("data-app", "fx"); ov.setAttribute("role", "dialog");
    var cv = document.createElement("canvas"); cv.className = "fx-cv"; if (!reduce) ov.appendChild(cv);
    var card = document.createElement("div"); card.className = "fx-card";
    var ic = document.createElement("div"); ic.className = "fx-ic";
    if (p.ring) { for (var i = 0; i < 3; i++) { var r = document.createElement("i"); r.className = "fx-ring"; ic.appendChild(r); } }
    if (p.ic === "check") ic.innerHTML = CHECK; else if (p.ic === "coin") { var cn = document.createElement("div"); cn.className = "fx-coin"; cn.textContent = "★"; ic.appendChild(cn); } else { var em = document.createElement("span"); em.className = "fx-em"; em.textContent = p.ic; ic.appendChild(em); }
    var t = document.createElement("div"); t.className = "fx-t"; t.textContent = o.title || "Done!";
    card.append(ic, t);
    if (o.amount != null && o.amount !== "") { var a = document.createElement("div"); a.className = "fx-a"; a.textContent = (o.prefix || "") + "0" + (o.suffix || ""); card.appendChild(a); count(a, Number(o.amount) || 0, o.prefix || "", o.suffix || ""); }
    if (o.sub) { var s = document.createElement("p"); s.className = "fx-s"; s.textContent = o.sub; card.appendChild(s); }
    var b = document.createElement("button"); b.type = "button"; b.className = "fx-ok"; b.textContent = o.button || "Great!"; card.appendChild(b);
    ov.appendChild(card);
    if (!reduce) for (var j = 0; j < (p.fl.length ? 14 : 0); j++) { var f = document.createElement("span"); f.className = "fx-fl"; f.textContent = p.fl[j % p.fl.length]; f.style.left = (4 + Math.random() * 90) + "%"; f.style.animationDelay = (Math.random() * 1.6) + "s"; f.style.fontSize = (22 + Math.random() * 20) + "px"; ov.appendChild(f); }
    document.body.appendChild(ov);
    var item = { ov: ov, stop: reduce ? null : engine(cv, p), timer: setTimeout(close, p.ms), onClose: o.onClose }; cur = item;
    ov.onclick = close; b.onclick = close;
    try { if (navigator.vibrate) navigator.vibrate(p.big ? [40, 60, 40, 60, 80] : [30, 40, 30]); } catch (e) {}
  }
  window.EmpFx = { show: show, close: close };
})();
