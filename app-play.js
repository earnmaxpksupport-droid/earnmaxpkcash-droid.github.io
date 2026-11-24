import { db, F } from "./firebase-auth.js";
const $ = id => document.getElementById(id), say = m => window.say && window.say(m);
const G = {
  basketball: { name: "Flying Basketball", site: "earn-max-pk-54bf9-afa61" },
  helicopter: { name: "Helicopter Escape", site: "helicopter-escape-game" }
};
const ORI = {}; Object.keys(G).forEach(k => { ORI["https://" + G[k].site + ".web.app"] = k; ORI["https://" + G[k].site + ".firebaseapp.com"] = k; });
let u = null, stop = null, best = {}, cur = null;

const paint = () => { const e = $("plBest"); if (e) e.textContent = cur ? String(best[cur] || 0) : "0"; };
function load() {
  const f = $("plFrame"); if (!f) return;
  if (location.hash !== "#play") { if (f.getAttribute("src") !== "about:blank") f.src = "about:blank"; return; }
  if (!cur) { location.hash = "games"; return; }
  $("plTitle").textContent = G[cur].name; paint();
  const url = "https://" + G[cur].site + ".web.app";
  if (f.getAttribute("src") !== url) f.src = url;
}
document.addEventListener("click", e => { const a = e.target.closest("[data-g]"); if (a && G[a.dataset.g]) cur = a.dataset.g; });
addEventListener("hashchange", () => { if (location.hash !== "#play") cur = null; load(); });
// the game tells us its score; only messages from our own game sites are accepted
addEventListener("message", e => {
  const id = ORI[e.origin], f = $("plFrame"), d = e.data;
  if (!u || !id || !f || e.source !== f.contentWindow || !d || d.emp !== "score") return;
  const sc = Math.floor(Number(d.score)), old = best[id] || 0;
  if (!(sc >= 1 && sc <= 100000) || sc <= old) return;
  best[id] = sc; paint();
  F.setDoc(F.doc(db, "users", u.uid, "games", id), { best: sc, updatedAt: F.serverTimestamp() })
    .then(() => say("New best score saved: " + sc))
    .catch(() => { best[id] = old; paint(); });
});
export function startPlay(user) {
  stopPlay(); u = user;
  stop = F.onSnapshot(F.collection(db, "users", u.uid, "games"), s => { s.docs.forEach(d => { best[d.id] = d.data().best || 0; }); paint(); }, () => {});
  load();
}
export function stopPlay() { if (stop) stop(); stop = null; u = null; best = {}; }
