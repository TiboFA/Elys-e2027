// Tests locaux (sans Cloudflare) : node tools/stats-worker/test.mjs
import worker, { validate } from './worker.js';
import { debias, byQuestion, CATS } from './debias.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('ÉCHEC :', m); } else console.log('ok     :', m); };

// base D1 simulée : une simple table de compteurs
function mockDB() {
  const t = new Map();
  return {
    t,
    prepare(sql) {
      return {
        bind: (...a) => ({ sql, a }),
        all: async () => ({ results: [...t].map(([k, n]) => ({ k, n })) }),
      };
    },
    batch: async (list) => { for (const s of list) t.set(s.a[0], (t.get(s.a[0]) || 0) + 1); },
  };
}
const env = (db) => ({ DB: db, ALLOWED_ORIGIN: 'https://site.example', ADMIN_TOKEN: 'secret-long' });
const post = (body, origin = 'https://site.example', raw) => new Request('https://w.example/hit', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });

// 1. validation et stockage
{
  const db = mockDB(), e = env(db);
  let r = await worker.fetch(post({ v: 1, items: [{ q: 'q12', a: '2' }, { q: 'q40', a: 'na' }], events: [{ e: 'serie', k: 3 }] }), e);
  ok(r.status === 204, 'envoi valide accepté');
  ok(db.t.get('a:q12:2') === 1 && db.t.get('a:q40:na') === 1 && db.t.get('s:3') === 1, 'compteurs par question et par série incrémentés');
  ok([...db.t.keys()].some((k) => /^d:\d{4}-\d{2}-\d{2}$/.test(k)), 'seul horodatage : le jour');
  ok([...db.t.keys()].every((k) => /^(a:q\d+:(-?\d|na)|s:\d+|d:\d{4}-\d{2}-\d{2})$/.test(k)), 'aucune clé ne contient autre chose que question, réponse, série ou jour');
  r = await worker.fetch(post({ v: 1, items: [{ q: 'q1; DROP TABLE', a: '2' }] }), e); ok(r.status === 400, 'identifiant de question invalide refusé');
  r = await worker.fetch(post({ v: 1, items: [{ q: 'q1', a: '9' }] }), e); ok(r.status === 400, 'réponse hors valeurs refusée');
  r = await worker.fetch(post({ v: 1, items: [{ q: 'q1', a: '1' }], user: 'abc', email: 'x@y.z' }), e); ok(r.status === 204 && ![...db.t.keys()].some((k) => k.includes('abc') || k.includes('@')), 'champs inattendus (identifiant, e-mail) ignorés, jamais stockés');
  r = await worker.fetch(post({ v: 1, items: Array.from({ length: 201 }, () => ({ q: 'q1', a: '1' })) }), e); ok(r.status === 400, 'plus de 200 éléments refusé');
  r = await worker.fetch(post(null, 'https://site.example', 'x'.repeat(9000)), e); ok(r.status === 413, 'corps trop volumineux refusé');
  r = await worker.fetch(post({ v: 1, items: [{ q: 'q1', a: '1' }] }, 'https://autre.example'), e); ok(r.status === 403, 'origine non autorisée refusée');
  r = await worker.fetch(post({ v: 1, items: [] }), e); ok(r.status === 400, 'envoi vide refusé');
}

// 2. administration
{
  const db = mockDB(), e = env(db);
  await worker.fetch(post({ v: 1, items: [{ q: 'q7', a: '1' }] }), e);
  const get = (auth) => worker.fetch(new Request('https://w.example/admin/totals', { headers: auth ? { Authorization: auth } : {} }), e);
  ok((await get()).status === 401, 'totaux refusés sans jeton');
  ok((await get('Bearer mauvais')).status === 401, 'totaux refusés avec un mauvais jeton');
  const r = await get('Bearer secret-long'); const j = await r.json();
  ok(r.status === 200 && j.counters['a:q7:1'] === 1, 'totaux lisibles avec le bon jeton');
  const nokToken = await worker.fetch(new Request('https://w.example/admin/totals', { headers: { Authorization: 'Bearer ' } }), { ...e, ADMIN_TOKEN: '' });
  ok(nokToken.status === 401, 'sans jeton configuré, l’administration reste fermée');
  ok((await worker.fetch(new Request('https://w.example/autre'), e)).status === 404, 'route inconnue : 404');
}

// 3. exactitude du redressement (simulation de 20 000 utilisateurs, brouillage 25 %)
{
  const P = 0.25, N = 20000;
  const vrai = { '2': 0.35, '1': 0.30, '0': 0.10, '-1': 0.12, '-2': 0.08, na: 0.05 };
  const cum = []; let c = 0; for (const k of CATS) { c += vrai[k]; cum.push([k, c]); }
  const draw = () => { const u = Math.random(); return cum.find(([, x]) => u <= x)[0]; };
  const obs = Object.fromEntries(CATS.map((k) => [k, 0]));
  for (let i = 0; i < N; i++) { let a = draw(); if (Math.random() < P) a = CATS[Math.floor(Math.random() * CATS.length)]; obs[a]++; }
  const { share, moe } = debias(obs, P);
  const maxErr = Math.max(...CATS.map((k) => Math.abs(share[k] - vrai[k])));
  console.log('        vrai   :', CATS.map((k) => (vrai[k] * 100).toFixed(1)).join(' | '));
  console.log('        observé:', CATS.map((k) => (obs[k] / N * 100).toFixed(1)).join(' | '), '(brouillé)');
  console.log('        redressé:', CATS.map((k) => (share[k] * 100).toFixed(1)).join(' | '));
  ok(maxErr < 0.02, `redressement exact à ${(maxErr * 100).toFixed(2)} point(s) près sur 20 000 réponses (marge annoncée ±${(moe * 100).toFixed(1)})`);
  // ce qu'un attaquant lirait pour une personne : la réponse envoyée n'est fiable qu'à 1 - p + p/6
  const fiable = 1 - P + P / 6;
  ok(fiable < 0.8, `une réponse isolée n'est exacte que dans ${(fiable * 100).toFixed(0)} % des cas : elle ne prouve rien sur une personne`);
}
ok(Object.keys(byQuestion({ 'a:q1:2': 3, 's:1': 9, 'd:2026-11-16': 4 })).join() === 'q1', 'regroupement par question');
console.log(fails ? `\n${fails} échec(s)` : '\nTous les tests passent');
process.exit(fails ? 1 : 0);
