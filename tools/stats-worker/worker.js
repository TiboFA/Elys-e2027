// Service de statistiques anonymes d'Élysée 2027 (Cloudflare Workers + D1).
//
// Ce que le service reçoit et conserve :
//   - POST /hit : des incréments « question, réponse » (réponses déjà brouillées par le navigateur)
//     et le numéro de série atteint. Il ne conserve que des COMPTEURS : pas d'identifiant, pas de
//     profil, pas d'adresse IP (le code ne lit jamais l'en-tête de l'adresse du client).
//   - GET /admin/totals : renvoie les compteurs, avec le jeton secret ADMIN_TOKEN.
//
// Les compteurs sont des totaux cumulés ; la seule dimension temporelle est le nombre de requêtes
// par jour (UTC), sans plus de précision.

const ANSWERS = new Set(['2', '1', '0', '-1', '-2', 'na']);
const QID = /^q\d{1,3}$/;
const MAX_BODY = 8192;
const MAX_ITEMS = 200;

const UPSERT = 'INSERT INTO counters (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1';

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
}
function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  return allowedOrigins(env).includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Max-Age': '86400' }
    : {};
}
function timingSafeEqual(a, b) {
  const enc = new TextEncoder(), x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export function validate(body) {
  if (!body || body.v !== 1) return null;
  const items = Array.isArray(body.items) ? body.items : [];
  const events = Array.isArray(body.events) ? body.events : [];
  if (items.length > MAX_ITEMS || events.length > 20) return null;
  const keys = [];
  for (const it of items) {
    if (!it || typeof it.q !== 'string' || typeof it.a !== 'string' || !QID.test(it.q) || !ANSWERS.has(it.a)) return null;
    keys.push(`a:${it.q}:${it.a}`);
  }
  for (const ev of events) {
    if (!ev || ev.e !== 'serie' || !Number.isInteger(ev.k) || ev.k < 1 || ev.k > 40) return null;
    keys.push(`s:${ev.k}`);
  }
  if (!keys.length) return null;
  keys.push(`d:${new Date().toISOString().slice(0, 10)}`);
  return keys;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (req.method === 'POST' && url.pathname === '/hit') {
      const origins = allowedOrigins(env);
      if (origins.length && !origins.includes(req.headers.get('Origin') || '')) return json({ error: 'origine non autorisée' }, 403, cors);
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: 'trop volumineux' }, 413, cors);
      let body; try { body = JSON.parse(raw); } catch { return json({ error: 'JSON invalide' }, 400, cors); }
      const keys = validate(body);
      if (!keys) return json({ error: 'requête invalide' }, 400, cors);
      await env.DB.batch(keys.map((k) => env.DB.prepare(UPSERT).bind(k)));
      return new Response(null, { status: 204, headers: cors });
    }

    if (req.method === 'GET' && url.pathname === '/admin/totals') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.ADMIN_TOKEN || !timingSafeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN)) return json({ error: 'non autorisé' }, 401, cors);
      const { results } = await env.DB.prepare('SELECT k, n FROM counters').all();
      return json({ counters: Object.fromEntries(results.map((r) => [r.k, r.n])) }, 200, cors);
    }

    return json({ error: 'introuvable' }, 404, cors);
  },
};
