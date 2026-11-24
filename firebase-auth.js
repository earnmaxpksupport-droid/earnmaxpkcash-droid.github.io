// SUPABASE replacement for the old Firebase wrapper.
// Same export names as before (A, F, auth, db, app, configured, isAdmin, authError),
// so the old site and admin modules keep working without changes.
// Documents live in one table, public.fs_docs (path, parent, data). Writes go through the
// fs_commit() database function, which applies sets, updates, increments, timestamps and batches.

const SUPA_URL = "https://fomvmlaqczmonvdlmnov.supabase.co";
const SUPA_KEY = "sb_publishable_ec0zsa1je3aeZBCdJX5rtA_k3sJyylS"; // public key only
if (!window.supabase || !window.supabase.createClient) {
  throw new Error("Supabase library not loaded. index.html must load the supabase.js script before the modules.");
}
export const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
export const configured = true;
export const app = null;
export const db = { provider: "supabase" };

// ---------- value helpers ----------
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(16).slice(2)).replace(/-/g, "").slice(0, 20);
const isoNow = () => new Date().toISOString();

// Timestamps are stored as { __ts: "ISO" }. Reading gives an object with toDate() and toMillis(), like Firestore.
function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object") {
    if (typeof v.__ts === "string") { const iso = v.__ts; return { __ts: iso, toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() }; }
    const o = {}; for (const k in v) o[k] = revive(v[k]); return o;
  }
  return v;
}
// Turns JS values into JSON for the database (Dates and timestamp objects become ISO strings).
function enc(v) {
  if (v && v.__sent) return v;
  if (v instanceof Date) return { __ts: v.toISOString() };
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === "object") {
    if (typeof v.toDate === "function") return { __ts: v.toDate().toISOString() };
    if (typeof v.__ts === "string") return { __ts: v.__ts };
    const o = {}; for (const k in v) o[k] = enc(v[k]); return o;
  }
  return v;
}
const cmpVal = x => (x && typeof x === "object" && typeof x.__ts === "string") ? x.__ts : (x && typeof x.toDate === "function" ? x.toDate().toISOString() : x);

function wrapErr(e) { const er = new Error((e && e.message) || "Database error"); er.code = "db/" + ((e && e.code) || "error"); er.details = e; return er; }

// ---------- references ----------
const mkDoc = path => { const s = path.split("/"); return { kind: "doc", path, id: s[s.length - 1], parent: s.slice(0, -1).join("/") }; };
const joinSegs = a => a.filter(x => typeof x === "string").join("/");
export function collection(_db, ...p) { return { kind: "col", path: joinSegs(p) }; }
export function doc(_db, ...p) {
  if (_db && _db.kind === "col") return mkDoc(_db.path + "/" + (p[0] || newId()));
  let path = joinSegs(p);
  if (path.split("/").length % 2 === 1) path += "/" + newId(); // a collection was given: create an id
  return mkDoc(path);
}

// ---------- sentinels ----------
export const increment = n => ({ __sent: "inc", n });
export const serverTimestamp = () => ({ __sent: "ts" });
export const deleteField = () => ({ __sent: "del" });

// ---------- snapshots ----------
function snapOf(ref, raw) {
  const has = raw !== null && raw !== undefined;
  return { id: ref.id, ref, exists: () => has, data: () => (has ? revive(raw) : undefined), get: k => (has ? revive(raw)[k] : undefined) };
}
function listSnap(rows) {
  return { docs: rows, empty: rows.length === 0, size: rows.length, forEach: fn => rows.forEach(fn) };
}

// ---------- queries (filtering and ordering happen in the browser on the rows of one collection) ----------
export const where = (f, op, v) => ({ k: "where", f, op, v });
export const orderBy = (f, dir) => ({ k: "order", f, dir: dir || "asc" });
export const limit = n => ({ k: "limit", n });
export const documentId = () => "__id";
export function query(col, ...cs) { return { kind: "q", col, cs }; }

function fieldOf(row, f) { return f === "__id" ? row.id : cmpVal(row.raw ? row.raw[f] : undefined); }
function passes(row, c) {
  const a = fieldOf(row, c.f), b = cmpVal(c.v);
  switch (c.op) {
    case "==": return a === b;
    case "!=": return a !== b;
    case ">": return a > b;
    case ">=": return a >= b;
    case "<": return a < b;
    case "<=": return a <= b;
    case "in": return Array.isArray(b) && b.includes(a);
    case "array-contains": return Array.isArray(a) && a.includes(b);
    default: return true;
  }
}

async function fetchRows(colPath) {
  const { data, error } = await sb.from("fs_docs").select("path,data").eq("parent", colPath).limit(1000);
  if (error) throw wrapErr(error);
  return (data || []).map(r => ({ id: r.path.split("/").pop(), ref: mkDoc(r.path), raw: r.data }));
}
async function runQuery(q) {
  const col = q.kind === "col" ? q : q.col;
  const cs = q.kind === "col" ? [] : q.cs;
  let rows = await fetchRows(col.path);
  cs.filter(c => c.k === "where").forEach(c => { rows = rows.filter(r => passes(r, c)); });
  const ord = cs.find(c => c.k === "order");
  if (ord) rows.sort((x, y) => { const a = fieldOf(x, ord.f), b = fieldOf(y, ord.f); const r = a > b ? 1 : a < b ? -1 : 0; return ord.dir === "desc" ? -r : r; });
  const lim = cs.find(c => c.k === "limit");
  if (lim) rows = rows.slice(0, lim.n);
  return rows.map(r => snapOf(r.ref, r.raw));
}

// ---------- reads ----------
export async function getDoc(ref) {
  const { data, error } = await sb.from("fs_docs").select("data").eq("path", ref.path).maybeSingle();
  if (error) throw wrapErr(error);
  return snapOf(ref, data ? data.data : null);
}
export async function getDocs(q) { return listSnap(await runQuery(q)); }
export async function getCountFromServer(q) { const n = (await runQuery(q)).length; return { data: () => ({ count: n }) }; }

// ---------- writes (all go through the database function fs_commit) ----------
async function commitOps(ops) {
  if (!ops.length) return;
  const { error } = await sb.rpc("fs_commit", { p_ops: ops });
  if (error) throw wrapErr(error);
}
const opSet = (ref, data, o) => ({ op: "set", path: ref.path, data: enc(data), merge: !!(o && o.merge) });
const opUpd = (ref, data) => ({ op: "update", path: ref.path, data: enc(data) });
const opDel = ref => ({ op: "delete", path: ref.path });

export async function setDoc(ref, data, o) { await commitOps([opSet(ref, data, o)]); }
export async function addDoc(col, data) { const ref = doc(col); await commitOps([opSet(ref, data)]); return ref; }
export function writeBatch() {
  const ops = [];
  const b = {
    set(ref, data, o) { ops.push(opSet(ref, data, o)); return b; },
    update(ref, data) { ops.push(opUpd(ref, data)); return b; },
    delete(ref) { ops.push(opDel(ref)); return b; },
    async commit() { const list = ops.splice(0); await commitOps(list); }
  };
  return b;
}
export async function runTransaction(_db, fn) {
  const ops = [];
  const t = {
    get: ref => getDoc(ref),
    set(ref, data, o) { ops.push(opSet(ref, data, o)); return t; },
    update(ref, data) { ops.push(opUpd(ref, data)); return t; },
    delete(ref) { ops.push(opDel(ref)); return t; }
  };
  const out = await fn(t);
  await commitOps(ops);
  return out;
}

// ---------- live updates (checks the database every 4 seconds and calls back only when data changed) ----------
export function onSnapshot(target, next, onError) {
  let stopped = false, last = null;
  const isDoc = target && target.kind === "doc";
  const tick = async () => {
    if (stopped) return;
    try {
      if (isDoc) {
        const { data, error } = await sb.from("fs_docs").select("data").eq("path", target.path).maybeSingle();
        if (error) throw wrapErr(error);
        const key = JSON.stringify(data ? data.data : null);
        if (key !== last) { last = key; next(snapOf(target, data ? data.data : null)); }
      } else {
        const rows = await runQuery(target);
        const key = JSON.stringify(rows.map(r => [r.id, r.ref && r.ref.path]).concat([JSON.stringify(rows.map(r => r.data ? r.data() : null))]));
        if (key !== last) { last = key; next(listSnap(rows)); }
      }
    } catch (e) { if (onError) onError(e); }
  };
  tick();
  const timer = setInterval(tick, 4000);
  return () => { stopped = true; clearInterval(timer); };
}

export const F = {
  doc, collection, query, where, orderBy, limit, documentId,
  getDoc, getDocs, getCountFromServer, setDoc, addDoc, writeBatch, runTransaction, onSnapshot,
  increment, serverTimestamp, deleteField,
  forEach: (snap, fn) => snap && snap.docs && snap.docs.forEach(fn)
};

// Admin = a row in the admins table. The database checks it (is_admin).
export const isAdmin = async () => { try { const r = await sb.rpc("is_admin"); return r.data === true; } catch (e) { return false; } };

// ---------- auth (same calls the old code makes, mapped to Supabase Auth) ----------
export const auth = { currentUser: null };
const mkUser = u => u ? { uid: u.id, email: u.email || "", displayName: (u.user_metadata && u.user_metadata.name) || "", emailVerified: !!u.email_confirmed_at } : null;
const authErr = (code, msg) => Object.assign(new Error(msg || code), { code });
function mapAuthErr(e) {
  const m = (e && e.message) || "";
  if (/already registered|already been registered/i.test(m)) return authErr("auth/email-already-in-use", m);
  if (/Invalid login/i.test(m)) return authErr("auth/invalid-credential", m);
  if (/Email not confirmed/i.test(m)) return authErr("auth/email-not-confirmed", m);
  if (/Password should be|at least/i.test(m)) return authErr("auth/weak-password", m);
  if (/rate limit|too many/i.test(m)) return authErr("auth/too-many-requests", m);
  if (/Failed to fetch|network/i.test(m)) return authErr("auth/network-request-failed", m);
  if (/valid.*email|invalid.*email|email.*invalid/i.test(m)) return authErr("auth/invalid-email", m);
  return authErr("auth/unknown", m);
}
export const A = {
  getAuth: () => auth,
  async createUserWithEmailAndPassword(_a, email, pass) {
    const r = await sb.auth.signUp({ email: String(email).trim().toLowerCase(), password: pass });
    if (r.error) throw mapAuthErr(r.error);
    auth.currentUser = mkUser(r.data.user);
    return { user: auth.currentUser };
  },
  async signInWithEmailAndPassword(_a, email, pass) {
    const r = await sb.auth.signInWithPassword({ email: String(email).trim(), password: pass });
    if (r.error) throw mapAuthErr(r.error);
    auth.currentUser = mkUser(r.data.user);
    return { user: auth.currentUser };
  },
  async updateProfile(user, p) {
    const r = await sb.auth.updateUser({ data: { name: p.displayName || "" } });
    if (r.error) throw mapAuthErr(r.error);
    if (user) user.displayName = p.displayName || "";
    if (auth.currentUser) auth.currentUser.displayName = p.displayName || "";
  },
  async signOut() { await sb.auth.signOut(); auth.currentUser = null; },
  async sendPasswordResetEmail(_a, email) {
    const r = await sb.auth.resetPasswordForEmail(String(email).trim());
    if (r.error) throw mapAuthErr(r.error);
  },
  onAuthStateChanged(_a, cb) {
    const sub = sb.auth.onAuthStateChange((_ev, session) => { auth.currentUser = mkUser(session && session.user); cb(auth.currentUser); });
    return () => sub.data.subscription.unsubscribe();
  }
};

const M = {
  "auth/email-already-in-use": "This email is already registered. Please log in.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/email-not-confirmed": "Please confirm your email first. Check your inbox.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
  "auth/network-request-failed": "No internet connection. Please try again."
};
export const authError = e => M[e && e.code] || ("Something went wrong: " + ((e && e.message) || "try again"));
