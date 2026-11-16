// Élysée 2027 : application sans serveur. Les réponses restent dans le navigateur.
// Identité visuelle : identite/ (palette nuit + or, couleurs des partis réservées aux données).
const CFG = window.E2027_CONFIG || {};
const $app = document.getElementById('app');
const OPTIONS = [
  { v: 2, t: "Tout à fait d'accord" },
  { v: 1, t: "Plutôt d'accord" },
  { v: 0, t: 'Neutre' },
  { v: -1, t: "Plutôt pas d'accord" },
  { v: -2, t: "Pas du tout d'accord" },
  { v: null, t: 'Sans avis', na: true },
];
const IMPORTANCE = [['faible', 'Faible', 0.5], ['moyenne', 'Moyenne', 1], ['forte', 'Forte', 2]];
const STANCE = { 2: ['Favorable', 'p2'], 1: ['Plutôt favorable', 'p1'], 0: ['Nuancé', 'p0'], '-1': ['Plutôt opposé', 'm1'], '-2': ['Opposé', 'm2'] };
const NIVEAU = { programme: 3, candidat: 2, proche: 1 };
const NIVEAU_LABEL = { programme: 'Programme', candidat: 'Déclaration du candidat', proche: "Déclaration d'un proche" };
const MIN_COMMON = 6;    // questions comparables minimales pour une proximité non « indicative »
const MAX_SEL = 3;       // candidats superposés au radar
const PRESEL = 2;        // présélection : les plus proches sur une base suffisante
const MIN_RESULTS = 9;   // réponses avec un avis sur les axes du radar nécessaires pour afficher le graphe
const GOLD = '#D8B45A';

let D = {};
let state = { answers: {}, counted: false, seed: 0 };
let mem = null;
const KEY = 'e2027.v1';
let resSel = null;
let chipSort = 'random'; // 'random' (au chargement) | 'alpha' | 'prox'
let showAllAxes = false;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const lastName = (c) => c.nom.split(' ').slice(-1)[0];
const alpha = (a, b) => lastName(a).localeCompare(lastName(b), 'fr');
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
};

// ---------- stockage local ----------
function load() {
  try { const r = localStorage.getItem(KEY); if (r) state = { ...state, ...JSON.parse(r) }; } catch { if (mem) state = mem; }
  if (!state.seed) { state.seed = (Math.random() * 2 ** 31) | 0; save(); }
}
// ordre aléatoire (fixe pendant une session) partout où l'ordre pourrait suggérer une préférence
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, salt = 0) { const r = rng(state.seed + salt), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { mem = state; } }
function reset() { state = { answers: {}, counted: false, seed: (Math.random() * 2 ** 31) | 0, statsConsent: state.statsConsent }; save(); resSel = null; chipSort = 'random'; D.questions = orderQuestions(D.baseQuestions); }

// Ordre semi-aléatoire, propre à chaque appareil. Chaque série (« tour ») contient une question par axe
// du radar, dans un ordre tiré au sort, plus une question hors radar tant qu'il en reste : les axes restent
// équilibrés quel que soit le nombre de réponses. Dans chaque axe, les questions les mieux documentées
// sortent en premier (tirées au sort entre elles), puis les autres.
function orderQuestions(qs) {
  const cover = (id) => new Set(D.positions.filter((p) => p.question === id).map((p) => p.candidat)).size;
  const pick = (list, salt) => { const l = [...list].sort((x, y) => cover(y.id) - cover(x.id)), h = Math.ceil(l.length / 2); return [...shuffled(l.slice(0, h), salt), ...shuffled(l.slice(h), salt + 50)]; };
  const byAxe = {};
  D.axes.forEach((a, ai) => { byAxe[a.id] = pick(qs.filter((q) => q.axe === a.id), 101 + ai); });
  // Hors radar : les questions d'actualité passent en premier (deux dans la première série, puis une par série),
  // de sorte qu'il y en ait toujours quelques-unes quel que soit le nombre de questions posées.
  const actu = shuffled(qs.filter((q) => !q.axe && q.actualite), 555);
  const hors = [...actu, ...pick(qs.filter((q) => !q.axe && !q.actualite), 777)];
  let cur = 0;
  const takeHors = (r) => { const n = r === 0 && actu.length >= 2 ? 2 : 1; const out = hors.slice(cur, cur + n); cur += out.length; return out; };
  const rounds = Math.max(...Object.values(byAxe).map((l) => l.length), 1 + Math.max(0, hors.length - (actu.length >= 2 ? 2 : 1)));
  const out = [], series = [];
  for (let r = 0; r < rounds; r++) {
    const round = shuffled([...D.axes.map((a) => byAxe[a.id][r]), ...takeHors(r)].filter(Boolean), 1009 + r);
    if (!round.length) continue;
    series.push([out.length + 1, out.length + round.length]);
    out.push(...round);
  }
  D.series = series;
  return out;
}
const seriesOf = (n) => D.series.findIndex(([a, b]) => n >= a && n <= b) + 1;

// ---------- calculs ----------
function posFor(qid, cid) {
  const list = D.positions.filter((p) => p.question === qid && p.candidat === cid);
  if (!list.length) return null;
  const top = Math.max(...list.map((p) => NIVEAU[p.niveau] || 0));
  const best = list.filter((p) => (NIVEAU[p.niveau] || 0) === top);
  return { score: best.reduce((s, p) => s + p.score, 0) / best.length, items: best };
}
const answered = (qid) => state.answers[qid] && 'v' in state.answers[qid];
const valued = (qid) => answered(qid) && state.answers[qid].v !== null && state.answers[qid].v !== undefined;
const countAnswered = () => D.questions.filter((q) => answered(q.id)).length;
const countValued = () => D.questions.filter((q) => valued(q.id)).length;
const countRadar = () => D.questions.filter((q) => q.axe && valued(q.id)).length;
const nbSeries = () => D.series.length;
const firstUnanswered = () => { const i = D.questions.findIndex((q) => !answered(q.id)); return i < 0 ? D.questions.length : i + 1; };
const unlocked = () => countRadar() >= MIN_RESULTS;
function weight(a) {
  if (a.imp === true) return 2;                    // ancien format (case à cocher)
  const f = IMPORTANCE.find((x) => x[0] === a.imp); return f ? f[2] : 1;
}
function axisPos(axeId, scoreOf) {
  let sum = 0, n = 0;
  for (const q of D.questions.filter((x) => x.axe === axeId)) {
    const s = scoreOf(q); if (s === null || s === undefined) continue;
    sum += (q.sens * s) / 2; n++;
  }
  return n ? sum / n : null;
}
const userPos = (axeId) => axisPos(axeId, (q) => (valued(q.id) ? state.answers[q.id].v : null));
const candPos = (axeId, cid) => axisPos(axeId, (q) => { const p = posFor(q.id, cid); return p ? p.score : null; });
function proximity(cid) {
  let num = 0, den = 0, n = 0;
  for (const q of D.questions) {
    if (!valued(q.id)) continue;
    const p = posFor(q.id, cid); if (!p) continue;
    const a = state.answers[q.id], w = weight(a);
    num += w * (1 - Math.abs(a.v - p.score) / 4); den += w; n++;
  }
  return { pct: den ? Math.round((num / den) * 100) : null, n };
}
const withData = () => D.candidats.filter((c) => D.positions.some((p) => p.candidat === c.id));
const candCount = (cid) => new Set(D.positions.filter((p) => p.candidat === cid).map((p) => p.question)).size;
const byId = (id) => D.candidats.find((c) => c.id === id);

// ---------- compteur anonyme ----------
async function counter(method) {
  if (!CFG.COUNTER_URL) return;
  try {
    const r = await fetch(CFG.COUNTER_URL, { method });
    const j = await r.json();
    document.getElementById('foot-counter').textContent = `${Number(j.total).toLocaleString('fr-FR')} simulations`;
  } catch { /* compteur facultatif */ }
}
function counterBump() { if (state.counted) return; state.counted = true; save(); counter('POST'); }

// ---------- statistiques anonymes (avec accord explicite) ----------
// Rien n'est envoyé sans accord. Avec accord, le navigateur envoie seulement des incréments
// « question, réponse, +1 », sans identifiant ni score de proximité. Une fraction des réponses
// (STATS_P, 25 % par défaut) est remplacée par une valeur tirée au hasard : il est impossible de
// connaître la réponse réelle d'une personne, mais les totaux restent exploitables une fois redressés.
const STATS_VALUES = ['2', '1', '0', '-1', '-2', 'na'];
const statsOn = () => !!CFG.STATS_URL && state.statsConsent === true;
function randomize(v) {
  const p = typeof CFG.STATS_P === 'number' ? CFG.STATS_P : 0.25;
  return Math.random() < p ? STATS_VALUES[Math.floor(Math.random() * STATS_VALUES.length)] : v;
}
function statsFlush(serie) {
  if (!statsOn()) return;
  state.sent = state.sent || [];
  const items = D.questions.filter((q) => answered(q.id) && !state.sent.includes(q.id))
    .map((q) => ({ q: q.id, a: randomize(state.answers[q.id].v === null ? 'na' : String(state.answers[q.id].v)) }));
  const events = serie ? [{ e: 'serie', k: serie }] : [];
  if (!items.length && !events.length) return;
  state.sent.push(...items.map((i) => i.q)); save();
  try { fetch(CFG.STATS_URL.replace(/\/$/, '') + '/hit', { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: 1, items, events }) }).catch(() => {}); } catch { /* facultatif */ }
}
function consentBlock(where) {
  if (!CFG.STATS_URL) return '';
  const on = state.statsConsent === true;
  return `<div class="card consent"><label class="switch" style="color:var(--txt);margin:0"><input type="checkbox" data-consent ${on ? 'checked' : ''}> Partager anonymement mes réponses pour aider à améliorer l'outil</label>
  <p class="small muted" style="margin:8px 0 0">Facultatif. Seuls des compteurs par question sont envoyés, sans identifiant ni adresse IP conservée, et une partie des réponses est volontairement remplacée au hasard : aucune réponse reçue ne peut être attribuée avec certitude, ni rattachée à vous. Aucun résultat n'est publié. ${where === 'legal' ? '' : '<a href="#/mentions">En savoir plus</a>.'}</p></div>`;
}

// ---------- dessins ----------
function radarSVG(series, opt = {}) {
  const n = D.axes.length, W = 440, H = opt.labels === false ? 300 : 410, cx = W / 2, cy = H / 2, R = opt.labels === false ? 130 : 118;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r * R, cy + Math.sin(ang(i)) * r * R];
  const poly = (r) => D.axes.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ');
  let g = [0.25, 0.5, 0.75, 1].map((r) => `<polygon class="ring" points="${poly(r)}"/>`).join('');
  g += D.axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  for (const s of series) {
    const pts = s.vals.map((v, i) => (v === null ? null : pt(i, (v + 1) / 2))).filter(Boolean);
    if (!pts.length) continue;
    const str = pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    if (pts.length >= 3) g += `<polygon points="${str}" fill="${s.color}" fill-opacity="${s.me ? 0.16 : 0.05}" stroke="${s.color}" stroke-width="${s.me ? 3 : 2}" ${s.me ? '' : `stroke-dasharray="${s.dash || '6 5'}"`} stroke-linejoin="round"/>`;
    else if (pts.length === 2) g += `<polyline points="${str}" fill="none" stroke="${s.color}" stroke-width="2"/>`;
    g += pts.map((p) => marker(p[0], p[1], s.me ? 'circle' : s.shape, s.color, s.me ? 4.5 : 4)).join('');
  }
  if (opt.labels !== false) g += D.axes.map((a, i) => {
    const [x, y] = pt(i, 1.2), c = Math.cos(ang(i));
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end'}">${esc(a.court)}</text>`;
  }).join('');
  return `<svg class="${opt.cls || 'radar'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria || 'Radar sur ' + n + ' thèmes')}">${g}</svg>`;
}
function miniRadar(idx) {
  const n = D.axes.length, c = 20, r = 17;
  const pt = (i, k) => [c + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * k, c + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * k];
  const ring = D.axes.map((_, i) => pt(i, 1).map((v) => v.toFixed(1)).join(',')).join(' ');
  const spokes = D.axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${i === idx ? GOLD : '#26344F'}" stroke-width="${i === idx ? 2 : 1}"/>`; }).join('');
  const [hx, hy] = pt(Math.max(idx, 0), 1);
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="${ring}" fill="none" stroke="#26344F"/>${spokes}${idx >= 0 ? `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3" fill="${GOLD}"/>` : `<circle cx="20" cy="20" r="4" fill="none" stroke="${GOLD}" stroke-width="1.5"/>`}</svg>`;
}
// Couleurs du graphe : la couleur du parti est conservée tant qu'elle se distingue nettement
// de l'or (« vous ») et des autres candidats affichés ; sinon une couleur de remplacement est prise.
const ALT = ['#4CC9F0', '#F72585', '#B8E986', '#FF9F1C', '#B388FF', '#F1F3F5', '#2EC4B6'];
const SLOTS = [{ dash: '7 5', shape: 'circle' }, { dash: '2 4', shape: 'square' }, { dash: '12 4 2 4', shape: 'triangle' }];
function lab(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const [x, y, z] = [(c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const MIN_DE = 32;
function displayStyles(ids) {
  const used = [GOLD, '#121B2E'], out = {};
  ids.forEach((id, k) => {
    let color = byId(id).couleur, adjusted = false;
    if (used.some((u) => dE(u, color) < MIN_DE)) { color = ALT.find((a) => used.every((u) => dE(u, a) >= MIN_DE)) || ALT[k % ALT.length]; adjusted = true; }
    used.push(color); out[id] = { color, adjusted, ...SLOTS[k % SLOTS.length] };
  });
  return out;
}
function marker(x, y, shape, color, r) {
  if (shape === 'square') return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" fill="${color}"/>`;
  if (shape === 'triangle') return `<polygon points="${x.toFixed(1)},${(y - r * 1.25).toFixed(1)} ${(x + r * 1.15).toFixed(1)},${(y + r * 0.85).toFixed(1)} ${(x - r * 1.15).toFixed(1)},${(y + r * 0.85).toFixed(1)}" fill="${color}"/>`;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}"/>`;
}
const legendLine = (color, dash, shape) => `<svg viewBox="0 0 30 10" aria-hidden="true" style="width:30px;height:10px"><line x1="0" y1="5" x2="30" y2="5" stroke="${color}" stroke-width="${dash ? 2 : 3}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${shape ? marker(15, 5, shape, color, 3.5) : ''}</svg>`;

// ---------- vues ----------
function viewHome() {
  const tot = D.questions.length, done = countAnswered(), nxt = firstUnanswered();
  const hero = radarSVG([{ vals: D.axes.map((_, i) => [0.55, 0.1, 0.35][i % 3]), color: GOLD, me: true }], { labels: false, cls: 'hero', aria: `Illustration : un radar à ${D.axes.length} axes` });
  let cta = `<a class="btn primary block" href="#/quiz/1">Commencer</a>`;
  if (done > 0 && done < tot) cta = `<a class="btn primary block" href="#/quiz/${nxt}">Reprendre · question ${nxt} sur ${tot}</a>${unlocked() ? '<a class="btn block" href="#/resultats">Voir mon graphe</a>' : ''}<button class="btn quiet block" data-act="reset">Recommencer</button>`;
  if (done === tot) cta = `<a class="btn primary block" href="#/resultats">Voir mon résultat</a><button class="btn quiet block" data-act="reset">Recommencer</button>`;
  return `${hero}
  <p class="eyebrow">Présidentielle 2027</p>
  <h1>Situez-vous face aux candidats déclarés</h1>
  <p class="lead">Réagissez à des affirmations sur ${D.axes.length} thèmes, puis comparez vos positions aux programmes publiés, axe par axe.</p>
  <div class="stats">
    <div><b>${D.axes.length}</b><span>thèmes</span></div>
    <div><b>${tot}</b><span>affirmations</span></div>
    <div><b>~${Math.max(5, Math.round(tot * 0.2))}</b><span>minutes</span></div>
  </div>
  <p class="small muted">Votre graphe s'affiche dès ${MIN_RESULTS} réponses. Chaque série d'une dizaine de questions l'affine ; vous pouvez vous arrêter et reprendre plus tard.</p>
  <div class="stack">${cta}</div>
  <a class="link-under" href="#/methode">Méthodologie et sources</a>
  <a class="link-under" href="#/avertissement" style="margin-top:8px">Avertissement : ce n'est pas une consigne de vote</a>
  <div class="banner" style="margin-top:20px">Version de travail : les positions des candidats sont extraites de leurs textes et déclarations publiés, et attendent une validation humaine.</div>`;
}

function viewQuiz(n) {
  const tot = D.questions.length;
  n = Math.min(Math.max(n, 1), tot);
  const q = D.questions[n - 1], a = state.answers[q.id];
  const ai = D.axes.findIndex((x) => x.id === q.axe), axe = D.axes[ai];
  const serie = seriesOf(n), endSerie = n === D.series[serie - 1][1] || n === tot;
  const nextHref = n === tot ? '#/resultats' : endSerie ? '#/serie/' + serie : '#/quiz/' + (n + 1);
  const opts = OPTIONS.map((o) => `<button class="opt${o.na ? ' na' : ''}" data-v="${o.v}" aria-pressed="${!!a && a.v === o.v}"><span class="dot"></span>${o.t}</button>`).join('');
  const imp = a && a.v !== null && a.v !== undefined ? (a.imp === true ? 'forte' : a.imp || 'moyenne') : null;
  return `
  <div class="topbar">
    <a class="iconbtn" href="${n > 1 ? '#/quiz/' + (n - 1) : '#/'}" aria-label="Question précédente">${ICON.back}</a>
    <span class="title">Question ${n} / ${tot}</span>
    <a class="textbtn" href="#/">Quitter</a>
  </div>
  <div class="track-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${n}" aria-label="Progression"><i style="width:${((n - 1) / tot) * 100}%"></i></div>
  <div class="theme">${miniRadar(ai)}<div><p class="eyebrow">${axe ? `Thème ${ai + 1} sur ${D.axes.length}` : q.actualite ? 'Actualité' : 'Hors radar'} · série ${serie}/${nbSeries()}</p><b>${esc(axe ? axe.nom : q.theme)}</b></div></div>
  ${q.actualite ? `<div class="notice"><b>Dans l'actualité depuis le ${frDate(q.actualite.depuis)}.</b> ${esc(q.actualite.evenement)} <a href="${esc(q.actualite.source.url)}" target="_blank" rel="noopener noreferrer">${esc(q.actualite.source.titre)}</a><br><span class="small muted">Cette question compte dans la proximité avec les candidats, mais ne déplace pas votre radar. Elle sera retirée quand le sujet ne fera plus l'actualité.</span></div>` : axe ? '' : '<p class="small muted" style="margin:-6px 0 12px">Cette question compte dans la proximité avec les candidats, mais ne déplace pas votre radar : elle ne se range sur aucun des axes.</p>'}
  <div class="card affirm"><p class="eyebrow">Affirmation</p><p class="statement">« ${esc(q.enonce)} »</p><p class="context">${esc(q.contexte)}</p></div>
  <div class="opts" role="group" aria-label="Votre position">${opts}</div>
  ${imp ? `<div class="importance"><p>Importance de ce sujet pour vous</p><div class="seg" role="group" aria-label="Importance">${IMPORTANCE.map(([k, t]) => `<button data-imp="${k}" aria-pressed="${imp === k}">${t}</button>`).join('')}</div></div>` : ''}
  ${a ? `<div id="says">${saysBlock(q)}</div>` : `<div class="locked">Répondez pour voir ce qu'en disent les candidats. Leurs positions sont masquées avant votre réponse pour ne pas vous influencer.</div>`}
  <div class="bottombar">
    <a class="btn" href="${nextHref}">Passer</a>
    <a class="btn primary" ${a ? `href="${nextHref}"` : 'aria-disabled="true" tabindex="-1"'}>${n === tot ? 'Mes résultats' : endSerie ? 'Fin de série' : 'Suivant'}</a>
  </div>`;
}

function saysBlock(q) {
  const has = [], none = [];
  for (const c of shuffled(D.candidats, Number(q.id.slice(1)) * 97)) { const p = posFor(q.id, c.id); (p ? has : none).push([c, p]); }
  const cards = has.map(([c, p]) => {
    const [lab, cls] = STANCE[String(Math.round(p.score))] || STANCE[0];
    const it = p.items[0];
    const media = it.source.media || new URL(it.source.url).hostname.replace(/^www\./, '');
    return `<details class="pos" style="--c:${c.couleur}">
      <summary><span class="who"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span></span><span class="tag ${cls}">${lab}</span></summary>
      <div class="body">
        <blockquote>« ${esc(it.citation)} »</blockquote>
        ${it.note ? `<p class="small muted">${esc(it.note)}</p>` : ''}
        <p class="src"><span class="lvl">${NIVEAU_LABEL[it.niveau]}</span><a href="${esc(it.source.url)}" target="_blank" rel="noopener noreferrer">${esc(media)}</a>, consultée le ${frDate(it.source.consulte)}</p>
        <a class="report" href="#/contact?q=${q.id}&c=${c.id}">Signaler une erreur sur cette position</a>
      </div></details>`;
  }).join('');
  return `<div class="says">
    <h2>Ce qu'en disent les candidats</h2>
    <p class="sub">Ordre tiré au sort. ${has.length} candidat${has.length > 1 ? 's' : ''} avec une position identifiée. « Favorable » ou « opposé » est une lecture de la citation par rapport à l'affirmation : touchez un nom pour lire l'extrait et sa source.</p>
    ${cards || '<p class="muted">Aucune position identifiée pour cette question.</p>'}
    <div class="none-list"><b>Pas de position publique identifiée dans les sources consultées (${none.length}) :</b> ${[...none].sort((x, y) => alpha(x[0], y[0])).map(([c]) => esc(c.nom)).join(', ')}.</div>
  </div>`;
}

function viewSeries(k) {
  const tot = D.questions.length, done = countAnswered(), val = countValued(), K = nbSeries();
  if (k >= K) { location.hash = '#/resultats'; return ''; }
  const ok = unlocked();
  statsFlush(k);
  return `<div class="topbar"><a class="iconbtn" href="#/quiz/${D.series[k - 1][1]}" aria-label="Question précédente">${ICON.back}</a><span class="title">Série ${k} sur ${K}</span><a class="textbtn" href="#/">Quitter</a></div>
  <div class="track-progress"><i style="width:${(done / tot) * 100}%"></i></div>
  <p class="eyebrow or">Série terminée</p>
  <h1>${done} question${done > 1 ? 's' : ''} sur ${tot}</h1>
  <p class="lead">${ok ? `Votre graphe est disponible. Il repose sur ${val} réponse${val > 1 ? 's' : ''} avec un avis ; chaque série supplémentaire le rend plus précis.` : `Il faut au moins ${MIN_RESULTS} réponses avec un avis sur les thèmes du radar pour afficher le graphe. Il vous en manque ${MIN_RESULTS - countRadar()}.`}</p>
  <div class="stack">
    ${ok ? '<a class="btn primary block" href="#/resultats">Voir mon graphe</a>' : ''}
    <a class="btn ${ok ? '' : 'primary'} block" href="#/quiz/${D.series[k][0]}">Continuer : série ${k + 1} (${D.series[k][1] - D.series[k][0] + 1} questions)</a>
  </div>
  ${state.statsConsent === undefined || k === 1 ? consentBlock('serie') : ''}
  <p class="small muted">Vous pouvez vous arrêter ici : vos réponses sont gardées sur cet appareil.</p>`;
}

function viewResults() {
  const done = countAnswered(), tot = D.questions.length, back = `#/quiz/${Math.min(firstUnanswered(), tot)}`;
  const head = `<div class="topbar"><a class="iconbtn" href="${done < tot ? back : '#/'}" aria-label="Retour">${ICON.back}</a><span class="title">Votre position</span><button class="iconbtn" data-act="share" aria-label="Partager l'outil">${ICON.share}</button></div>`;
  if (!unlocked()) {
    const need = MIN_RESULTS - countRadar();
    return `${head}<p class="eyebrow">Résultat · ${D.axes.length} axes</p><h1>Graphe verrouillé</h1><p class="lead">Il faut au moins ${MIN_RESULTS} réponses avec un avis pour dessiner vos positions. Il vous en manque ${need}.</p><div class="stack"><a class="btn primary block" href="#/quiz/${firstUnanswered()}">${done ? 'Continuer le questionnaire' : 'Commencer'}</a></div>`;
  }
  counterBump();
  statsFlush();
  const prox = withData().map((c) => ({ c, ...proximity(c.id) })).filter((x) => x.pct !== null).sort((a, b) => b.pct - a.pct || b.n - a.n);
  if (!resSel) resSel = prox.filter((x) => x.n >= MIN_COMMON).slice(0, PRESEL).map((x) => x.c.id);
  const ds = displayStyles(resSel);
  const series = resSel.map((id) => ({ vals: D.axes.map((a) => candPos(a.id, id)), ...ds[id] }));
  series.push({ vals: D.axes.map((a) => userPos(a.id)), color: GOLD, me: true });
  const legend = `<span>${legendLine(GOLD)}Vous</span>` + resSel.map((id) => `<span>${legendLine(ds[id].color, ds[id].dash, ds[id].shape)}${esc(byId(id).nom)}${ds[id].adjusted ? ' <small class="muted">(couleur ajustée)</small>' : ''}</span>`).join('');
  const solidC = prox.filter((x) => x.n >= MIN_COMMON).map((x) => x.c), thinC = prox.filter((x) => x.n < MIN_COMMON).map((x) => x.c);
  const noProx = withData().filter((c) => !prox.some((x) => x.c.id === c.id)).sort(alpha);
  const chipList = chipSort === 'alpha' ? [...withData()].sort(alpha) : chipSort === 'prox' ? [...solidC, ...thinC, ...noProx] : shuffled(withData(), 7);
  const sortBtn = (k, label) => `<button type="button" class="seg" data-act="chipsort" data-sort="${k}" aria-pressed="${chipSort === k}">${label}</button>`;
  const chips = chipList.map((c) => `<button class="chip" style="--c:${ds[c.id] ? ds[c.id].color : c.couleur}" data-sel="${c.id}" aria-pressed="${resSel.includes(c.id)}"><span class="pdot" style="--c:${ds[c.id] ? ds[c.id].color : c.couleur}"></span>${esc(c.nom)}</button>`).join('');
  const axes = showAllAxes ? D.axes : D.axes.slice(0, 3);
  const rows = axes.map((a) => {
    const u = userPos(a.id), x = (v) => ((v + 1) * 50).toFixed(1);
    const na = D.questions.filter((q) => q.axe === a.id && valued(q.id)).length, nt = D.questions.filter((q) => q.axe === a.id).length;
    let marks = '';
    const c0 = resSel.length ? candPos(a.id, resSel[0]) : null;
    if (u !== null && c0 !== null) marks += `<span class="gap-line" style="left:${Math.min(x(u), x(c0))}%;width:${Math.abs(x(u) - x(c0))}%"></span>`;
    marks += resSel.map((id) => { const v = candPos(a.id, id); return v === null ? '' : `<span class="mk ${ds[id].shape}" style="left:${x(v)}%;--c:${ds[id].color}" title="${esc(byId(id).nom)}"></span>`; }).join('');
    if (u !== null) marks += `<span class="mk me" style="left:${x(u)}%" title="Vous"></span>`;
    const nd = resSel.filter((id) => candPos(a.id, id) === null).map((id) => byId(id).nom);
    return `<div class="gap-row"><span class="lbl">${esc(a.court)}<small>${na}/${nt} réponse${na > 1 ? 's' : ''}${na === 1 ? ' · indicatif' : ''}</small></span><div class="gap-track">${marks}</div></div>
      <div class="poles"><span>${esc(a.poleA)}</span><span>${esc(a.poleB)}</span></div>
      ${nd.length ? `<p class="small muted" style="margin:-4px 0 8px 106px">Non documenté : ${nd.map(esc).join(', ')}</p>` : ''}`;
  }).join('');
  const row = (x) => `<div class="prox-row" style="--c:${x.c.couleur}"><span class="pdot"></span><b>${esc(x.c.nom)}</b><span class="pct">${x.pct} %</span><span class="pbar"><i style="width:${x.pct}%"></i></span><span class="n">${esc(x.c.parti)} · ${x.n} question${x.n > 1 ? 's' : ''} comparable${x.n > 1 ? 's' : ''}</span></div>`;
  const solid = prox.filter((x) => x.n >= MIN_COMMON), thin = prox.filter((x) => x.n < MIN_COMMON);
  const nodata = D.candidats.length - withData().length;
  return `${head}
  <p class="eyebrow">Résultat · ${D.axes.length} axes · ${countValued()} réponses</p>
  ${radarSVG(series)}
  <div class="legend">${legend}</div>
  ${done < tot ? `<div class="card" style="margin-top:14px"><b>Il reste ${tot - done} question${tot - done > 1 ? 's' : ''}.</b><p class="small muted" style="margin:4px 0 12px">Chaque réponse affine la carte, surtout sur les thèmes où vous avez peu répondu.</p><a class="btn primary block" href="#/quiz/${firstUnanswered()}">Affiner mon graphe</a></div>` : ''}
  <div class="rowhead"><h2>Comparer avec</h2></div>
  <div class="segs" role="group" aria-label="Ordre de la liste"><span class="small muted">Ordre</span>${sortBtn('random', 'Tiré au sort')}${sortBtn('alpha', 'Alphabétique')}${sortBtn('prox', 'Proximité')}</div>
  <div class="chips">${chips}</div>
  <div class="card">
    <p class="eyebrow">Écart par thème</p>
    ${rows}
    <button class="more" data-act="axes">${showAllAxes ? 'Voir moins' : `Voir les ${D.axes.length} axes`} ${ICON.chev}</button>
  </div>
  <div class="rowhead"><h2>Proximité par candidat</h2></div>
  <p class="small muted">Écart moyen entre vos réponses et les positions documentées, pondéré par l'importance indiquée. Ce n'est pas une consigne de vote : un score élevé sur peu de questions dit peu de chose.</p>
  <div class="prox">${solid.map(row).join('') || '<p class="muted">Aucun candidat ne compte encore assez de questions comparables.</p>'}</div>
  ${thin.length ? `<h3 style="margin:18px 0 4px">Base trop étroite pour comparer</h3><p class="small muted">Moins de ${MIN_COMMON} questions comparables : pourcentages fragiles, non classés avec les autres.</p><div class="prox">${thin.sort((a, b) => alpha(a.c, b.c)).map(row).join('')}</div>` : ''}
  <p class="small muted" style="margin-top:12px">${nodata} autres candidats déclarés n'ont pas encore de position sourcée : <a href="#/candidats">voir la liste</a>.</p>
  <div class="duo" style="margin-top:20px"><a class="btn" href="#/methode">Méthodologie</a><button class="btn primary" data-act="share">Partager</button></div>
  <button class="btn quiet block" data-act="reset" style="margin-top:8px">Recommencer</button>
  ${consentBlock('results')}`;
}

function viewCandidates() {
  const items = [...D.candidats].sort(alpha).map((c) => {
    const k = candCount(c.id);
    return `<div class="cand" style="--c:${c.couleur}"><div class="info"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span>
      ${c.declaration ? `<span>${esc(c.declaration)}</span>` : ''}
      ${c.programme ? `<span><a href="${esc(c.programme.url)}" target="_blank" rel="noopener noreferrer">${esc(c.programme.titre)}</a></span>` : ''}</div>
      <span class="badge ${k ? 'on' : ''}">${k ? `${k}/${D.questions.length}` : 'à documenter'}</span></div>`;
  }).join('');
  return `<p class="eyebrow">Ordre alphabétique</p><h1>Candidats déclarés</h1>
  <p class="lead">${D.candidats.length} personnes ayant officiellement et publiquement annoncé leur candidature. La liste officielle sera arrêtée par le Conseil constitutionnel au plus tard le 26 mars 2027, après réception des 500 parrainages.</p>
  <p class="small muted">Liste établie d'après <a href="https://www.franceinfo.fr/elections/presidentielle/portraits-qui-sont-les-candidats-declares-a-l-election-presidentielle-de-2027_8208032.html" target="_blank" rel="noopener noreferrer">franceinfo</a> et <a href="https://fr.wikipedia.org/wiki/Candidatures_%C3%A0_l%27%C3%A9lection_pr%C3%A9sidentielle_fran%C3%A7aise_de_2027" target="_blank" rel="noopener noreferrer">Wikipédia</a>. Le liseré reprend la couleur usuelle du parti ; gris pour les candidats sans étiquette. Le nombre indique les questions où une position est documentée.</p>
  ${items}`;
}

function viewMethod() {
  const nd = D.candidats.filter((c) => !candCount(c.id));
  const hist = D.version.historique.map((h) => `<li><b>v${esc(h.version)}</b> · ${frDate(h.date)} : ${esc(h.resume)}</li>`).join('');
  const axes = D.axes.map((a) => `<tr><td>${esc(a.nom)}</td><td>${esc(a.poleA)}</td><td>${esc(a.poleB)}</td></tr>`).join('');
  return `<div class="prose"><p class="eyebrow">Méthodologie et sources</p><h1>Méthode</h1>
  <div class="banner">${esc(D.version.statut)}. Version ${esc(D.version.version)} du ${frDate(D.version.date)}.</div>
  <h2>Qui figure dans l'outil</h2>
  <p>Toute personne ayant officiellement et publiquement annoncé sa candidature, sans filtre de notoriété ni de sondage. Les personnes seulement pressenties ne sont pas incluses. Dès publication de la liste du Conseil constitutionnel, l'outil bascule sur cette liste. Quand l'ordre d'affichage pourrait suggérer une préférence (positions des candidats, choix des candidats à comparer), il est tiré au sort à chaque session ; les listes de référence sont alphabétiques. La liste « Comparer avec » s'ouvre dans un ordre tiré au sort et peut ensuite être triée par ordre alphabétique ou par proximité avec vos réponses.</p>
  <h2>Comment les questions sont rédigées</h2>
  <ul><li>Une affirmation neutre, formulée dans le même sens pour tous, accompagnée d'un court rappel factuel.</li>
  <li>Les réponses possibles sont identiques pour toutes les questions : « neutre » compte comme une position médiane, « sans avis » n'est pas pris en compte.</li>
  <li>Les positions des candidats ne sont visibles qu'après votre réponse.</li></ul>
  <h2>Les ${D.axes.length} axes</h2>
  <div class="tablewrap"><table><thead><tr><th>Axe</th><th>Centre du radar</th><th>Bord du radar</th></tr></thead><tbody>${axes}</tbody></table></div>
  <p class="small muted">Les deux pôles décrivent des positions, pas un jugement. Il n'y a pas de « bon » côté.</p>
  <h2>Questions d'actualité</h2>
  <p>Quelques questions portent sur un événement récent qui a fait réagir plusieurs candidats (prix des carburants, aide à l'Ukraine, violences lors de mouvements sociaux…). Règles : un sujet n'est retenu que si au moins deux candidats de camps différents ont réagi publiquement ; l'affirmation est reformulée de façon neutre, avec l'événement et une source datée ; la question est hors radar (elle compte dans la proximité, sans déplacer votre graphe) ; elle est retirée dès que le sujet ne fait plus l'actualité, ou au plus tard à la date indiquée dans le code. Il y en a toujours quelques-unes, dont deux dans la première série. Questions d'actualité en ce moment : ${D.questions.filter((q) => q.actualite).length}.</p>
  <h2>Questions hors radar</h2>
  <p>Certaines questions ne se rangent sur aucun axe sans fausser son sens : le choix du nucléaire (on peut être pro-nucléaire et très exigeant sur le climat), l'organisation territoriale, la protection des enfants face aux écrans, certains sujets internationaux, la laïcité (une laïcité stricte peut viser l'État, comme l'abrogation du Concordat, ou les individus, comme l'interdiction du voile : ces deux exigences se compenseraient sur l'axe Société). Elles restent posées et comptent dans la proximité avec les candidats, mais ne déplacent pas le radar. Thèmes concernés : ${[...new Set(D.questions.filter((q) => !q.axe).map((q) => q.theme))].join(', ')}.</p>
  <h2>Comment une position est établie</h2>
  <ul><li>Chaque position repose sur une citation exacte, vérifiée mot pour mot dans le document source, avec lien et date de consultation.</li>
  <li>Hiérarchie des sources : un programme publié pèse plus qu'une déclaration du candidat, qui pèse plus que celle d'un proche. Si plusieurs sources existent, la plus haute est retenue.</li>
  <li>Le passage de la citation à une note de -2 à +2 est une lecture d'analyste, affichée à côté de la citation et validée par un humain avant publication.</li>
  <li>Quand aucune source ne traite le sujet, l'outil l'écrit : cela signifie « non trouvé dans les sources consultées ».</li></ul>
  <h2>Séries et précision du graphe</h2>
  <p>Les questions sont groupées en séries d'une dizaine : chacune comporte une question par axe du radar, plus une question hors radar tant qu'il en reste. Quel que soit le nombre de réponses, les ${D.axes.length} axes restent équilibrés. L'ordre est tiré au sort pour chaque appareil, dans l'ordre des thèmes comme dans le choix des questions ; les questions où le plus de candidats ont une position documentée sont proposées en premier. Le graphe s'affiche à partir de ${MIN_RESULTS} réponses avec un avis sur les thèmes du radar. Un thème où vous n'avez répondu qu'à une question est signalé comme indicatif.</p>
  <h2>Calcul de la proximité</h2>
  <p>Pour chaque candidat, on compare uniquement les questions où vous avez répondu et où une position est documentée. L'écart moyen est converti en pourcentage ; l'importance indiquée pondère chaque question (faible ×0,5, moyenne ×1, forte ×2). Le nombre de questions comparables est toujours indiqué. En dessous de ${MIN_COMMON}, le résultat est signalé comme indicatif. Les candidats sont classés par proximité ; ceux qui ont trop peu de questions comparables sont présentés à part, sans classement. Le radar présélectionne les deux plus proches sur une base suffisante.</p>
  <h2>Limites de cette version</h2>
  <ul><li>Les programmes complets sont rares à ce stade. Les textes utilisés sont ceux publiés par les candidats ou leur parti, complétés par des déclarations rapportées par la presse.</li>
  <li>Le programme du Rassemblement national utilisé est celui des législatives de 2024.</li>
  <li>Le programme des Écologistes n'a pas pu être lu automatiquement : les positions de Marine Tondelier viennent de la presse.</li>
  <li>${nd.length} candidats déclarés n'ont pas encore de position sourcée : ${nd.map((c) => esc(c.nom)).join(', ')}.</li></ul>
  <h2>Mises à jour</h2>
  <p>Questions, candidats et positions sont revus régulièrement. Une veille automatisée peut proposer des ajouts, mais rien n'est publié sans validation humaine. Chaque version est datée.</p>
  <ul>${hist}</ul>
  <h2>Vos données</h2>
  <p>Il n'y a ni compte ni suivi. Vos réponses sont enregistrées uniquement dans le navigateur de cet appareil et ne sont envoyées nulle part. Seul un compteur global du nombre de simulations peut exister, sans aucune information sur les réponses.</p></div>`;
}


// ---------- pages d'information ----------
function viewDisclaimer() {
  return `<div class="prose"><p class="eyebrow">À lire avant d'utiliser l'outil</p><h1>Avertissement</h1>
  <div class="notice">Élysée 2027 est un outil d'information indépendant. Il ne donne aucune consigne de vote et ne remplace ni la lecture des programmes, ni le débat.</div>
  <h2>Indépendance</h2>
  <p>L'outil n'est lié à aucun parti, candidat, équipe de campagne, média, institution publique ou entreprise de sondage. Il ne reçoit aucun financement politique. Il ne contient ni publicité ni traceur.</p>
  <h2>Ce que mesure l'outil, et ce qu'il ne mesure pas</h2>
  <ul>
    <li>Le radar et les pourcentages de proximité reflètent uniquement les questions posées et les positions qu'il a été possible de documenter. Ils simplifient des positions politiques souvent plus nuancées.</li>
    <li>Un candidat sans position documentée sur un sujet n'est pas « neutre » sur ce sujet : il ne s'est simplement pas exprimé, ou l'outil n'a pas trouvé la source.</li>
    <li>La proximité avec un candidat n'est pas une recommandation. Un score élevé sur peu de questions dit peu de chose ; l'outil l'indique.</li>
    <li>Ce n'est pas un sondage. Aucun résultat agrégé n'est publié. Seuls les utilisateurs qui l'acceptent explicitement partagent des compteurs anonymes et brouillés, utilisés uniquement pour améliorer les questions.</li>
  </ul>
  <h2>Sources et lecture des positions</h2>
  <ul>
    <li>Chaque position repose sur une citation exacte d'un programme, d'un site officiel ou d'un article de presse, avec le lien et la date de consultation. Les citations sont courtes et reproduites à des fins d'information, conformément au droit de courte citation.</li>
    <li>Le classement d'une citation (« favorable », « opposé »…) est une lecture d'analyste. Il peut être discuté : la citation et sa source sont toujours affichées pour que chacun juge par lui-même.</li>
    <li>Les programmes évoluent pendant la campagne. Une position peut être dépassée entre deux mises à jour ; la date de chaque version est indiquée.</li>
  </ul>
  <h2>Erreurs et droit de réponse</h2>
  <p>Malgré le soin apporté, des erreurs sont possibles. Tout candidat, toute équipe de campagne et tout utilisateur peut signaler une citation erronée, mal attribuée, dépassée ou mal classée via le <a href="#/contact">formulaire de contact</a>. Les demandes fondées sont corrigées dans la version suivante, avec mention dans l'historique.</p>
  <h2>Responsabilité</h2>
  <p>L'outil est fourni en l'état, à titre informatif. L'éditeur ne saurait être tenu responsable de l'usage qui en est fait ni des décisions prises sur son fondement. Les liens vers des sites tiers sont fournis pour vérification ; leur contenu relève de leurs éditeurs.</p></div>`;
}

function viewLegal() {
  return `<div class="prose"><p class="eyebrow">Informations légales</p><h1>Mentions légales et confidentialité</h1>
  <h2>Éditeur</h2>
  <p>Ce site est édité à titre non professionnel par un particulier, qui a choisi de ne pas rendre public son nom, comme le permet l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique. Ses éléments d'identification ont été communiqués à l'hébergeur. Pour toute demande, utilisez le <a href="#/contact">formulaire de contact</a>.</p>
  <h2>Hébergeur</h2>
  <p>${esc(CFG.HOST_INFO || "GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis — https://github.com")}</p>
  <h2>Données personnelles</h2>
  <ul>
    <li><b>Questionnaire :</b> aucune donnée n'est envoyée. Vos réponses, l'ordre des questions et vos préférences sont enregistrés uniquement dans le stockage local de votre navigateur. Vous pouvez les effacer à tout moment avec le bouton « Recommencer » ou en vidant les données du site dans votre navigateur.</li>
    <li><b>Cookies et traceurs :</b> aucun. Ni mesure d'audience nominative, ni publicité, ni réseau social intégré. Les polices de caractères sont hébergées sur le site lui-même.</li>
    <li><b>Statistiques anonymes${CFG.STATS_URL ? '' : ' (non activées)'} :</b> uniquement si vous cochez la case prévue (désactivée par défaut, modifiable à tout moment ci-dessous). Le navigateur envoie alors, pour chaque question répondue, un simple incrément « question, réponse » : ni identifiant, ni ensemble de vos réponses, ni score de proximité avec les candidats. Une réponse sur quatre environ est remplacée au hasard avant l'envoi, si bien qu'aucune réponse reçue ne peut être tenue pour certaine, et qu'aucune n'est rattachée à une personne : le service ne conserve aucun identifiant qui permettrait de regrouper les réponses d'un même utilisateur. Ces totaux servent uniquement à améliorer les questions (questions incomprises, souvent passées, peu discriminantes) ; ils ne sont jamais publiés ni communiqués, et ne constituent pas un sondage.${consentBlock('legal')}</li>
    <li><b>Adresses IP :</b> le service qui reçoit les statistiques et les messages ne les enregistre pas et ne tient aucun journal de requêtes. Les requêtes transitent par Cloudflare, qui assure la liaison sécurisée avec le serveur de l'éditeur et voit donc l'adresse du visiteur le temps du transit, selon sa propre politique de confidentialité. Pour limiter les abus (envois en rafale), une empreinte salée de l'adresse est gardée en mémoire vive quelques minutes, jamais écrite sur disque, avec un sel renouvelé chaque jour.</li>
    <li><b>Compteur de simulations${CFG.COUNTER_URL ? '' : ' (non activé)'} :</b> s'il est activé, il n'enregistre qu'un nombre total, sans aucune réponse ni identifiant.</li>
    <li><b>Formulaire de contact :</b> le message, l'objet et, si vous la donnez, votre adresse électronique sont transmis au serveur de l'éditeur${CFG.CONTACT_SERVICE ? ' (' + esc(CFG.CONTACT_SERVICE) + ')' : ''}, uniquement pour traiter votre demande. Ils sont conservés au plus douze mois puis supprimés automatiquement. L'adresse électronique est facultative : sans elle, aucune réponse ne peut vous être apportée.</li>
    <li><b>Vos droits :</b> vous pouvez demander l'accès, la rectification ou l'effacement des données transmises via le formulaire, et introduire une réclamation auprès de la CNIL (www.cnil.fr).</li>
  </ul>
  <h2>Propriété intellectuelle</h2>
  <p>Les citations restent la propriété de leurs auteurs et sont reproduites au titre du droit de courte citation, avec leur source. Le code et la méthode de l'outil sont publiés ${CFG.LICENCE ? 'sous licence ' + esc(CFG.LICENCE) : 'sur le dépôt du projet'}.</p></div>`;
}

const CONTACT_OBJETS = ["Signaler une erreur sur une position", "Droit de réponse d'un candidat ou de son équipe", "Proposer une question ou une source", "Autre"];
function viewContact(params) {
  const q = params.get('q'), c = params.get('c');
  const question = q ? D.baseQuestions.find((x) => x.id === q) : null, cand = c ? byId(c) : null;
  const pre = question ? `${question.id} · « ${question.enonce} »${cand ? ' · ' + cand.nom : ''}` : '';
  const active = !!CFG.CONTACT_URL;
  return `<div class="prose"><p class="eyebrow">Contact</p><h1>Écrire à l'éditeur</h1>
  <p class="lead">Une citation erronée, une position dépassée, un droit de réponse, une suggestion : chaque message est lu.</p>
  ${active ? '' : '<div class="notice">Le formulaire n\'est pas encore relié à un service de réception : il ne peut pas encore être envoyé.</div>'}
  <form class="form" id="contact-form" novalidate>
    <label>Objet<select name="objet" required>${CONTACT_OBJETS.map((o, i) => `<option${(q && i === 0) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
    <label>Question ou candidat concerné (facultatif)<input name="question" maxlength="300" value="${esc(pre)}" placeholder="Par exemple : question sur le SMIC, Marine Tondelier"></label>
    <label>Message<textarea name="message" required maxlength="3000" placeholder="Décrivez le problème. Pour une correction, indiquez si possible la source exacte (lien, date)."></textarea></label>
    <label>Votre adresse électronique (facultative, seulement si vous souhaitez une réponse)<input name="email" type="email" maxlength="200" autocomplete="email"></label>
    <div class="hp" aria-hidden="true"><label>Ne pas remplir<input name="site_web" tabindex="-1" autocomplete="off"></label></div>
    <p class="small muted">Les données envoyées servent uniquement à traiter votre message et sont supprimées au plus tard douze mois après. Voir <a href="#/mentions">confidentialité</a>.</p>
    <button class="btn primary block" type="submit" ${active ? '' : 'disabled aria-disabled="true"'}>Envoyer</button>
    <p class="small muted" id="contact-status" role="status" aria-live="polite"></p>
  </form></div>`;
}
async function sendContact(form) {
  const st = document.getElementById('contact-status');
  const f = new FormData(form);
  if (f.get('site_web')) { st.textContent = 'Message envoyé. Merci.'; form.reset(); return; } // robot
  const message = String(f.get('message') || '').trim();
  if (message.length < 10) { st.textContent = 'Le message est trop court.'; return; }
  const email = String(f.get('email') || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = "L'adresse électronique semble incorrecte."; return; }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; st.textContent = 'Envoi en cours…';
  try {
    const r = await fetch(CFG.CONTACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ objet: f.get('objet'), question: f.get('question'), message, email: email || undefined, page: 'Élysée 2027 v' + D.version.version }) });
    if (!r.ok) throw new Error(r.status);
    st.textContent = 'Message envoyé. Merci.'; form.reset();
  } catch { st.textContent = "L'envoi a échoué. Réessayez plus tard."; }
  btn.disabled = false;
}

// ---------- routeur ----------
function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const [p, arg] = path.split('/');
  const params = new URLSearchParams(query || '');
  let html;
  if (p === 'quiz') html = viewQuiz(parseInt(arg, 10) || 1);
  else if (p === 'serie') html = viewSeries(parseInt(arg, 10) || 1);
  else if (p === 'resultats') html = viewResults();
  else if (p === 'candidats') html = viewCandidates();
  else if (p === 'methode') html = viewMethod();
  else if (p === 'avertissement') html = viewDisclaimer();
  else if (p === 'mentions') html = viewLegal();
  else if (p === 'contact') html = viewContact(params);
  else html = viewHome();
  document.body.classList.toggle('focus', ['quiz', 'serie', 'resultats'].includes(p));
  $app.innerHTML = html;
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#/' + p));
  window.scrollTo(0, 0);
}
const rerender = (fn) => { const y = window.scrollY; $app.innerHTML = fn(); window.scrollTo(0, y); };
const quizN = () => parseInt(location.hash.split('/')[2], 10) || 1;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); }

async function share() {
  const url = location.href.split('#')[0];
  const data = { title: 'Élysée 2027', text: 'Situez-vous face aux candidats déclarés à la présidentielle 2027.', url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(url); toast('Lien copié. Vos réponses ne sont pas partagées.');
  } catch { /* partage annulé */ }
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-v],[data-imp],[data-sel],[data-act]'); if (!t) return;
  if (t.dataset.v !== undefined) {
    const q = D.questions[quizN() - 1], prev = state.answers[q.id];
    const v = t.dataset.v === 'null' ? null : Number(t.dataset.v);
    state.answers[q.id] = { v, imp: v === null ? 'moyenne' : (prev && prev.imp) || 'moyenne' }; save();
    rerender(() => viewQuiz(quizN()));
  } else if (t.dataset.imp) {
    const q = D.questions[quizN() - 1]; state.answers[q.id].imp = t.dataset.imp; save();
    rerender(() => viewQuiz(quizN()));
  } else if (t.dataset.sel) {
    const id = t.dataset.sel, i = resSel.indexOf(id);
    if (i >= 0) resSel.splice(i, 1); else { if (resSel.length >= MAX_SEL) resSel.shift(); resSel.push(id); }
    rerender(viewResults);
  } else if (t.dataset.act === 'chipsort') { chipSort = t.dataset.sort; rerender(viewResults);
  } else if (t.dataset.act === 'axes') { showAllAxes = !showAllAxes; rerender(viewResults); }
  else if (t.dataset.act === 'share') share();
  else if (t.dataset.act === 'reset') {
    if (confirm('Effacer toutes vos réponses sur cet appareil ?')) { reset(); location.hash = '#/'; route(); }
  }
});
document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-consent]')) return;
  state.statsConsent = e.target.checked; save();
  if (state.statsConsent) statsFlush(); toast(state.statsConsent ? 'Partage anonyme activé. Merci.' : 'Partage anonyme désactivé.');
});
document.addEventListener('submit', (e) => { if (e.target.id === 'contact-form') { e.preventDefault(); sendContact(e.target); } });
window.addEventListener('hashchange', route);

(async function init() {
  try {
    const f = async (n) => (await fetch(`data/${n}.json`, { cache: 'no-cache' })).json();
    const [axes, questions, candidats, positions, version] = await Promise.all(['axes', 'questions', 'candidats', 'positions', 'version'].map(f));
    D = { axes, questions, candidats, positions, version };
  } catch {
    $app.innerHTML = '<p class="loading">Impossible de charger les données. Ouvrez le site depuis un serveur web (et non directement depuis un fichier).</p>'; return;
  }
  load();
  const today = CFG.TODAY || new Date().toISOString().slice(0, 10);
  D.questions = D.questions.filter((q) => !q.actualite || q.actualite.jusqu_au >= today); // questions d'actualité échues : retirées
  D.baseQuestions = D.questions;
  D.questions = orderQuestions(D.baseQuestions);
  document.getElementById('foot-version').textContent = `Version ${D.version.version} · ${frDate(D.version.date)}`;
  counter('GET');
  route();
})();
