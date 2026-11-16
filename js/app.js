// Élysée 2027 : application sans serveur. Les réponses restent dans le navigateur.
const CFG = window.E2027_CONFIG || {};
const $app = document.getElementById('app');
const LEVELS = [
  { v: -2, t: "Pas du tout d'accord" },
  { v: -1, t: "Plutôt pas d'accord" },
  { v: 0, t: 'Neutre' },
  { v: 1, t: "Plutôt d'accord" },
  { v: 2, t: "Tout à fait d'accord" },
];
const STANCE = { 2: ['Favorable', 'p2'], 1: ['Plutôt favorable', 'p1'], 0: ['Nuancé', 'p0'], '-1': ['Plutôt opposé', 'm1'], '-2': ['Opposé', 'm2'] };
const NIVEAU = { programme: 3, candidat: 2, proche: 1 };
const NIVEAU_LABEL = { programme: 'Programme', candidat: 'Déclaration du candidat', proche: "Déclaration d'un proche" };
const MIN_COMMON = 6;
const MAX_SEL = 4;

let D = {};                // données
let state = { answers: {}, seed: 0, counted: false };
let mem = null;            // repli si localStorage indisponible
const KEY = 'e2027.v1';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function load() {
  try { const r = localStorage.getItem(KEY); if (r) state = { ...state, ...JSON.parse(r) }; } catch { if (mem) state = mem; }
  if (!state.seed) { state.seed = (Math.random() * 2 ** 31) | 0; save(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { mem = state; } }
function reset() { state = { answers: {}, seed: (Math.random() * 2 ** 31) | 0, counted: false }; save(); }

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = rng(seed), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- calculs ----------
function posFor(qid, cid) {
  const list = D.positions.filter((p) => p.question === qid && p.candidat === cid);
  if (!list.length) return null;
  const top = Math.max(...list.map((p) => NIVEAU[p.niveau] || 0));
  const best = list.filter((p) => (NIVEAU[p.niveau] || 0) === top);
  const score = best.reduce((s, p) => s + p.score, 0) / best.length;
  return { score, items: best };
}
const answered = (qid) => state.answers[qid] && 'v' in state.answers[qid];
const countAnswered = () => D.questions.filter((q) => answered(q.id)).length;
const countValued = () => D.questions.filter((q) => answered(q.id) && state.answers[q.id].v !== null).length;

// position sur un axe, de -1 (pôle A) à +1 (pôle B)
function axisPos(axeId, scoreOf) {
  let sum = 0, n = 0;
  for (const q of D.questions.filter((x) => x.axe === axeId)) {
    const s = scoreOf(q); if (s === null || s === undefined) continue;
    sum += (q.sens * s) / 2; n++;
  }
  return n ? sum / n : null;
}
const userPos = (axeId) => axisPos(axeId, (q) => (answered(q.id) ? state.answers[q.id].v : null));
const candPos = (axeId, cid) => axisPos(axeId, (q) => { const p = posFor(q.id, cid); return p ? p.score : null; });

function proximity(cid) {
  let num = 0, den = 0, n = 0;
  for (const q of D.questions) {
    const a = state.answers[q.id]; const p = posFor(q.id, cid);
    if (!a || a.v === null || a.v === undefined || !p) continue;
    const w = a.imp ? 2 : 1;
    num += w * (1 - Math.abs(a.v - p.score) / 4); den += w; n++;
  }
  return { pct: den ? Math.round((num / den) * 100) : null, n };
}
const withData = () => D.candidats.filter((c) => D.positions.some((p) => p.candidat === c.id));
const candCount = (cid) => new Set(D.positions.filter((p) => p.candidat === cid).map((p) => p.question)).size;
const byId = (id) => D.candidats.find((c) => c.id === id);

// ---------- compteur anonyme ----------
async function counterGet() {
  if (!CFG.COUNTER_URL) return;
  try { const r = await fetch(CFG.COUNTER_URL); const j = await r.json(); document.getElementById('foot-counter').textContent = `${Number(j.total).toLocaleString('fr-FR')} simulations`; } catch { /* compteur facultatif */ }
}
async function counterBump() {
  if (!CFG.COUNTER_URL || state.counted) return;
  state.counted = true; save();
  try { const r = await fetch(CFG.COUNTER_URL, { method: 'POST' }); const j = await r.json(); document.getElementById('foot-counter').textContent = `${Number(j.total).toLocaleString('fr-FR')} simulations`; } catch { /* ignoré */ }
}

// ---------- vues ----------
function viewHome() {
  const done = countAnswered(), tot = D.questions.length;
  const nw = withData().length;
  let cta = `<a class="btn primary block" href="#/quiz/1">Commencer la simulation</a>`;
  if (done > 0 && done < tot) cta = `<a class="btn primary block" href="#/quiz/${done + 1}">Reprendre (question ${done + 1} sur ${tot})</a><button class="btn ghost block" data-act="reset" style="margin-top:10px">Recommencer</button>`;
  if (done === tot) cta = `<a class="btn primary block" href="#/resultats">Voir mon résultat</a><button class="btn ghost block" data-act="reset" style="margin-top:10px">Recommencer</button>`;
  return `
  <p class="eyebrow">Présidentielle 2027 · 18 avril 2027</p>
  <h1>Situez-vous par rapport aux candidats déclarés</h1>
  <p class="lead">${tot} affirmations, huit thèmes, une carte de vos positions. Pour chaque affirmation, vous pouvez consulter ce que les candidats ont écrit ou dit, avec la source.</p>
  <div class="banner">Version de travail. Les positions des candidats sont extraites de leurs textes publiés et attendent une validation humaine avant publication définitive.</div>
  ${cta}
  <div class="stats">
    <div class="stat"><b>${D.candidats.length}</b><span>candidats déclarés</span></div>
    <div class="stat"><b>${nw}</b><span>avec positions sourcées</span></div>
    <div class="stat"><b>${D.positions.length}</b><span>positions citées</span></div>
  </div>
  <div class="panel small muted">
    <b style="color:var(--txt)">Principes.</b> Questions formulées de façon neutre. Mêmes règles pour tous les candidats. Ordre d'affichage tiré au sort. Une absence de position est affichée comme telle. <a href="#/methode">Lire la méthode</a>.
  </div>`;
}

function viewQuiz(n) {
  const tot = D.questions.length;
  n = Math.min(Math.max(n, 1), tot);
  const q = D.questions[n - 1];
  const a = state.answers[q.id];
  const axe = D.axes.find((x) => x.id === q.axe);
  const prog = D.questions.map((x, i) => `<i class="${answered(x.id) ? 'done' : ''} ${i + 1 === n ? 'cur' : ''}"></i>`).join('');
  const opts = LEVELS.map((l) => `<button class="opt" data-v="${l.v}" aria-pressed="${a && a.v === l.v}"><span class="dot"></span>${l.t}</button>`).join('')
    + `<button class="opt na" data-v="null" aria-pressed="${a && a.v === null}"><span class="dot"></span>Sans avis</button>`;
  const last = n === tot;
  return `
  <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${n}" aria-label="Progression">${prog}</div>
  <div class="qmeta"><span>${esc(axe.nom)}</span><span>${n} / ${tot}</span></div>
  <p class="statement">${esc(q.enonce)}</p>
  <p class="context">${esc(q.contexte)}</p>
  <div class="opts" role="group" aria-label="Votre position">${opts}</div>
  ${a && a.v !== null ? `<label class="switch"><input type="checkbox" data-imp ${a.imp ? 'checked' : ''}> Ce sujet compte beaucoup pour moi</label>` : ''}
  ${a ? `<div id="says">${saysBlock(q)}</div>` : `<div class="locked">Répondez pour voir ce qu'en disent les candidats. Les positions sont masquées avant votre réponse pour ne pas vous influencer.</div>`}
  <div class="qnav">
    ${n > 1 ? `<a class="btn back ghost" href="#/quiz/${n - 1}" aria-label="Question précédente">←</a>` : `<a class="btn back ghost" href="#/" aria-label="Accueil">←</a>`}
    <a class="btn primary ${a ? '' : 'dis'}" ${a ? `href="${last ? '#/resultats' : '#/quiz/' + (n + 1)}"` : 'aria-disabled="true" tabindex="-1" style="opacity:.45;pointer-events:none"'}>${last ? 'Voir mes résultats' : 'Question suivante'}</a>
  </div>`;
}

function saysBlock(q) {
  const order = shuffled(D.candidats.map((c) => c.id), state.seed + q.id.charCodeAt(2) * 97 + q.id.charCodeAt(1));
  const has = [], none = [];
  for (const id of order) { const p = posFor(q.id, id); (p ? has : none).push([byId(id), p]); }
  const cards = has.map(([c, p]) => {
    const [lab, cls] = STANCE[String(Math.round(p.score))] || STANCE[0];
    const it = p.items[0];
    return `<details class="pos" style="--c:${c.couleur}">
      <summary><span class="who"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span></span><span class="tag ${cls}">${lab}</span></summary>
      <div class="body">
        <blockquote>« ${esc(it.citation)} »</blockquote>
        ${it.note ? `<p class="small muted">${esc(it.note)}</p>` : ''}
        <p class="src"><span class="lvl">${NIVEAU_LABEL[it.niveau]}</span><a href="${esc(it.source.url)}" target="_blank" rel="noopener noreferrer">Source</a>, consultée le ${frDate(it.source.consulte)}</p>
      </div></details>`;
  }).join('');
  const noneNames = none.map(([c]) => esc(c.nom)).join(', ');
  return `<div class="says">
    <h3>Ce qu'en disent les candidats</h3>
    <p class="sub">${has.length} candidat${has.length > 1 ? 's' : ''} avec une position identifiée. Le classement « favorable / opposé » est une lecture de la citation par rapport à l'affirmation ci-dessus. Touchez un nom pour lire l'extrait.</p>
    ${cards || '<p class="muted">Aucune position identifiée pour cette question.</p>'}
    <div class="none-list"><b>Pas de position publique identifiée sur ce point dans les sources consultées (${none.length}) :</b><br>${noneNames}</div>
  </div>`;
}

function radarSVG(selected) {
  const W = 440, H = 420, cx = 220, cy = 208, R = 120, n = D.axes.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r * R, cy + Math.sin(ang(i)) * r * R];
  const rings = [0.25, 0.5, 0.75, 1].map((r) => `<polygon class="${r === 0.5 ? 'mid' : 'ring'}" points="${D.axes.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`).join('');
  const spokes = D.axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const labels = D.axes.map((a, i) => {
    const [x, y] = pt(i, 1.2); const c = Math.cos(ang(i));
    const anchor = Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" style="font-size:13px">${esc(a.court)}</text>`;
  }).join('');
  const shape = (vals, color, opts = {}) => {
    const pts = vals.map((v, i) => (v === null ? null : pt(i, (v + 1) / 2))).filter(Boolean);
    if (!pts.length) return '';
    const s = pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${opts.r || 3.5}" fill="${color}"/>`).join('');
    const body = pts.length >= 3 ? `<polygon points="${s}" fill="${color}" fill-opacity="${opts.fill ?? 0.12}" stroke="${color}" stroke-width="${opts.w || 2}" ${opts.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/>` : pts.length === 2 ? `<polyline points="${s}" fill="none" stroke="${color}" stroke-width="${opts.w || 2}"/>` : '';
    return body + dots;
  };
  let g = '';
  for (const id of selected) g += shape(D.axes.map((a) => candPos(a.id, id)), byId(id).couleur, { dash: true, w: 2, fill: 0.06 });
  g += shape(D.axes.map((a) => userPos(a.id)), '#d8b45a', { w: 3.2, fill: 0.2, r: 4.5 });
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar de vos positions sur ${n} thèmes">${rings}${spokes}${g}${labels}</svg>`;
}

let resSel = null;
function viewResults() {
  const done = countAnswered();
  if (done === 0) return `<h1>Pas encore de résultat</h1><p class="lead">Répondez d'abord à quelques questions.</p><a class="btn primary" href="#/quiz/1">Commencer</a>`;
  counterBump();
  const prox = withData().map((c) => ({ c, ...proximity(c.id) })).filter((x) => x.pct !== null).sort((a, b) => b.pct - a.pct);
  if (!resSel) resSel = prox.filter((x) => x.n >= MIN_COMMON).slice(0, 3).map((x) => x.c.id);
  const chips = withData().map((c) => `<button class="chip" style="--c:${c.couleur}" data-sel="${c.id}" aria-pressed="${resSel.includes(c.id)}"><i></i>${esc(c.nom)}</button>`).join('');
  const legend = `<span><i style="--c:#d8b45a"></i>Vous</span>` + resSel.map((id) => `<span><i style="--c:${byId(id).couleur}"></i>${esc(byId(id).nom)}</span>`).join('');
  const axes = D.axes.map((a) => {
    const u = userPos(a.id);
    const m = (v, cls, col, label) => v === null ? '' : `<span class="mk ${cls}" style="left:${((v + 1) * 50).toFixed(1)}%;--c:${col}" title="${esc(label)}"></span>`;
    const marks = resSel.map((id) => m(candPos(a.id, id), '', byId(id).couleur, byId(id).nom)).join('') + m(u, 'me', '#d8b45a', 'Vous');
    const nd = resSel.filter((id) => candPos(a.id, id) === null).map((id) => byId(id).nom);
    return `<div class="axis"><h3>${esc(a.nom)}</h3>
      <div class="poles"><span>${esc(a.poleA)}</span><span>${esc(a.poleB)}</span></div>
      <div class="track">${marks}</div>
      ${u === null ? '<p class="nd">Vous n\'avez pas exprimé d\'avis sur ce thème.</p>' : ''}
      ${nd.length ? `<p class="nd">Pas de position documentée : ${nd.map(esc).join(', ')}.</p>` : ''}</div>`;
  }).join('');
  const row = (x) => `<div class="prox-row" style="--c:${x.c.couleur}"><b>${esc(x.c.nom)}</b><span class="pct">${x.pct} %</span><span class="bar"><i style="width:${x.pct}%"></i></span><span class="n">${esc(x.c.parti)} · calculé sur ${x.n} question${x.n > 1 ? 's' : ''} comparable${x.n > 1 ? 's' : ''}</span></div>`;
  const solid = prox.filter((x) => x.n >= MIN_COMMON), thin = prox.filter((x) => x.n < MIN_COMMON);
  const rows = solid.map(row).join('') + (thin.length ? `<h3 style="margin:18px 0 6px">Base trop étroite pour comparer</h3><p class="small muted">Moins de ${MIN_COMMON} questions comparables : ces pourcentages sont fragiles et ne sont pas classés avec les autres.</p>${thin.map(row).join('')}` : '');
  const nodata = D.candidats.length - withData().length;
  return `
  <p class="eyebrow">Votre carte</p>
  <h1>Vos positions</h1>
  ${done < D.questions.length ? `<div class="banner">Vous avez répondu à ${done} question${done > 1 ? 's' : ''} sur ${D.questions.length}. <a href="#/quiz/${done + 1}">Continuer</a></div>` : ''}
  <p class="muted small">Sur chaque axe, le centre correspond au premier pôle et le bord extérieur au second. Les axes sans réponse ou sans position documentée ne sont pas tracés.</p>
  <div class="radar-wrap">${radarSVG(resSel)}<div class="legend">${legend}</div></div>
  <h2 style="margin-top:22px">Comparer avec</h2>
  <p class="small muted">Jusqu'à ${MAX_SEL} candidats. Présélection : les trois les plus proches de vous sur les questions comparables.</p>
  <div class="chips">${chips}</div>
  <h2>Thème par thème</h2>${axes}
  <h2>Proximité par candidat</h2>
  <p class="small muted">Écart moyen entre vos réponses et les positions documentées, pondéré par l'importance que vous avez indiquée. Ce n'est ni un classement ni une consigne de vote : un score élevé sur peu de questions dit peu de chose.</p>
  <div class="prox">${rows || '<p class="muted">Aucune question comparable pour l\'instant.</p>'}</div>
  <p class="small muted" style="margin-top:14px">${nodata} autres candidats déclarés n'ont pas encore de position sourcée dans cette version : <a href="#/candidats">voir la liste</a>.</p>
  <div class="row" style="margin-top:20px"><a class="btn" href="#/quiz/1">Revoir mes réponses</a><button class="btn ghost" data-act="reset">Recommencer</button></div>`;
}

function viewCandidates() {
  const items = [...D.candidats].sort((a, b) => a.nom.split(' ').slice(-1)[0].localeCompare(b.nom.split(' ').slice(-1)[0], 'fr'))
    .map((c) => {
      const k = candCount(c.id);
      return `<div class="cand" style="--c:${c.couleur}"><div class="info"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span>
        ${c.declaration ? `<span>${esc(c.declaration)}</span>` : ''}
        ${c.programme ? `<span><a href="${esc(c.programme.url)}" target="_blank" rel="noopener noreferrer">${esc(c.programme.titre)}</a></span>` : ''}</div>
        <span class="badge ${k ? 'on' : ''}">${k ? `${k}/${D.questions.length} positions` : 'à documenter'}</span></div>`;
    }).join('');
  return `<h1>Candidats déclarés</h1>
  <p class="lead">${D.candidats.length} personnes ayant officiellement et publiquement annoncé leur candidature au ${frDate(D.version.date)}. La liste officielle sera arrêtée par le Conseil constitutionnel au plus tard le 26 mars 2027, après réception des 500 parrainages.</p>
  <p class="small muted">Liste établie d'après <a href="https://www.franceinfo.fr/elections/presidentielle/portraits-qui-sont-les-candidats-declares-a-l-election-presidentielle-de-2027_8208032.html" target="_blank" rel="noopener noreferrer">franceinfo</a> (36 candidats au 9 novembre) et <a href="https://fr.wikipedia.org/wiki/Candidatures_%C3%A0_l%27%C3%A9lection_pr%C3%A9sidentielle_fran%C3%A7aise_de_2027" target="_blank" rel="noopener noreferrer">Wikipédia</a>. Ordre alphabétique, sans lien avec le poids politique. Les couleurs reprennent les codes usuels des partis ; les candidats sans étiquette sont en gris.</p>
  ${items}`;
}

function viewMethod() {
  const nd = D.candidats.filter((c) => !candCount(c.id));
  const hist = D.version.historique.map((h) => `<li><b>v${esc(h.version)}</b> · ${frDate(h.date)} : ${esc(h.resume)}</li>`).join('');
  const axes = D.axes.map((a) => `<tr><td>${esc(a.nom)}</td><td>${esc(a.poleA)}</td><td>${esc(a.poleB)}</td></tr>`).join('');
  return `<div class="prose"><h1>Méthode</h1>
  <div class="banner">${esc(D.version.statut)}. Version ${esc(D.version.version)} du ${frDate(D.version.date)}.</div>
  <h2>Qui figure dans l'outil</h2>
  <p>Toute personne ayant officiellement et publiquement annoncé sa candidature, sans filtre de notoriété ni de sondage. Les personnes seulement pressenties (par exemple Dominique de Villepin, François Hollande ou Bernard Cazeneuve à la date de cette version) ne sont pas incluses. Dès publication de la liste du Conseil constitutionnel, l'outil bascule sur cette liste.</p>
  <h2>Comment les questions sont rédigées</h2>
  <ul><li>Une affirmation neutre, formulée dans le même sens pour tous, accompagnée d'un court rappel factuel.</li>
  <li>Les cinq niveaux de réponse sont identiques pour toutes les questions.</li>
  <li>Les positions des candidats ne sont visibles qu'après votre réponse.</li>
  <li>L'ordre d'affichage des candidats est tiré au sort pour chaque session.</li></ul>
  <h2>Les huit axes</h2>
  <div class="tablewrap"><table><thead><tr><th>Axe</th><th>Centre du radar</th><th>Bord du radar</th></tr></thead><tbody>${axes}</tbody></table></div>
  <p class="small muted">Les deux pôles décrivent des positions, pas un jugement. Il n'y a pas de « bon » côté.</p>
  <h2>Comment une position est établie</h2>
  <ul><li>Chaque position repose sur une citation exacte, vérifiée mot pour mot dans le document source, avec lien et date de consultation.</li>
  <li>Hiérarchie des sources : un programme publié pèse plus qu'une déclaration du candidat, qui pèse plus que celle d'un proche. Si plusieurs sources existent, la plus haute est retenue.</li>
  <li>Le passage de la citation à une note de -2 à +2 est une lecture d'analyste. Elle est affichée à côté de la citation pour que vous puissiez la contester, et validée par un humain avant publication.</li>
  <li>Quand aucune source ne traite le sujet, l'outil l'écrit. Ce n'est pas un refus de position : cela signifie « non trouvé dans les sources consultées ».</li></ul>
  <h2>Calcul de la proximité</h2>
  <p>Pour chaque candidat, on compare uniquement les questions où vous avez répondu et où une position est documentée. L'écart moyen est converti en pourcentage ; une question marquée « compte beaucoup pour moi » compte double. Le nombre de questions comparables est toujours indiqué. En dessous de ${MIN_COMMON}, le résultat est signalé comme indicatif.</p>
  <h2>Limites de cette version</h2>
  <ul><li>Les programmes complets sont rares à ce stade de la campagne. Les textes utilisés sont ceux publiés sur les sites des candidats ou de leur parti.</li>
  <li>Le programme du Rassemblement national utilisé est celui des législatives de 2024 ; Marine Le Pen n'a pas publié de programme présidentiel à la date de cette version.</li>
  <li>Le programme des Écologistes n'a pas pu être lu automatiquement (accès refusé par le site) : il reste à intégrer.</li>
  <li>${nd.length} candidats déclarés n'ont pas encore de position sourcée : ${nd.map((c) => esc(c.nom)).join(', ')}.</li>
  <li>Les positions prises à l'oral (interviews, meetings) ne sont pas encore intégrées.</li></ul>
  <h2>Mises à jour</h2>
  <p>Les questions, la liste des candidats et les positions sont revues régulièrement. Une veille automatisée peut proposer des ajouts, mais rien n'est publié sans validation humaine. Chaque version est datée, car modifier les questions modifie la comparabilité des résultats.</p>
  <ul>${hist}</ul>
  <h2>Vos données</h2>
  <p>Il n'y a ni compte ni suivi. Vos réponses sont enregistrées uniquement dans le navigateur de cet appareil et ne sont envoyées nulle part. Seul un compteur global du nombre de simulations peut exister, sans aucune information sur les réponses.</p></div>`;
}

// ---------- routeur ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [p, arg] = h.split('/');
  let html;
  if (p === 'quiz') html = viewQuiz(parseInt(arg, 10) || 1);
  else if (p === 'resultats') html = viewResults();
  else if (p === 'candidats') html = viewCandidates();
  else if (p === 'methode') html = viewMethod();
  else html = viewHome();
  $app.innerHTML = html;
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#/' + p));
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-v],[data-sel],[data-act]'); if (!t) return;
  if (t.dataset.v !== undefined) {
    const n = parseInt(location.hash.split('/')[2], 10) || 1, q = D.questions[n - 1];
    const v = t.dataset.v === 'null' ? null : Number(t.dataset.v);
    const prev = state.answers[q.id];
    state.answers[q.id] = { v, imp: v === null ? false : !!(prev && prev.imp) }; save();
    const y = window.scrollY; $app.innerHTML = viewQuiz(n); window.scrollTo(0, y);
    document.getElementById('says')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else if (t.dataset.sel) {
    const id = t.dataset.sel, i = resSel.indexOf(id);
    if (i >= 0) resSel.splice(i, 1); else { if (resSel.length >= MAX_SEL) resSel.shift(); resSel.push(id); }
    const y = window.scrollY; $app.innerHTML = viewResults(); window.scrollTo(0, y);
  } else if (t.dataset.act === 'reset') {
    if (confirm('Effacer toutes vos réponses sur cet appareil ?')) { reset(); resSel = null; location.hash = '#/'; route(); }
  }
});
document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-imp]')) return;
  const n = parseInt(location.hash.split('/')[2], 10) || 1, q = D.questions[n - 1];
  state.answers[q.id].imp = e.target.checked; save();
});
window.addEventListener('hashchange', route);

(async function init() {
  try {
    const f = async (n) => (await fetch(`data/${n}.json`, { cache: 'no-cache' })).json();
    const [axes, questions, candidats, positions, version] = await Promise.all(['axes', 'questions', 'candidats', 'positions', 'version'].map(f));
    D = { axes, questions, candidats, positions, version };
  } catch (err) {
    $app.innerHTML = `<p class="loading">Impossible de charger les données. Ouvrez le site depuis un serveur web (et non directement depuis un fichier).</p>`; return;
  }
  load();
  document.getElementById('foot-version').textContent = `Version ${D.version.version} · ${frDate(D.version.date)}`;
  counterGet();
  route();
})();
