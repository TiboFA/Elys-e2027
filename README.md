# Élysée 2027

Outil de positionnement face aux candidats déclarés à la présidentielle de 2027. Site statique, sans serveur ni compte : les réponses restent dans le navigateur.

## Lancer en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765. Un serveur est nécessaire, car les données sont chargées par `fetch`.

## Données (`data/`)

| Fichier | Contenu |
|---|---|
| `axes.json` | 9 axes du radar et leurs deux pôles |
| `questions.json` | affirmations neutres ; `sens` indique vers quel pôle pousse un accord (+1 : second pôle). `axe: null` + `theme` = question hors radar (comptée dans la proximité, sans effet sur le graphe) ; l'ordre de présentation est calculé par l'application |
| `candidats.json` | candidats clairement déclarés, parti, couleur, date et source de déclaration |
| `candidats_en_attente.json` | personnes retirées tant que leur candidature n'est pas clairement déclarée (leurs positions restent dans `tools/gen.py`, liste `EXCLUS`) |
| `positions.json` | une citation sourcée par couple question/candidat, avec note de -2 à +2, niveau de source et statut |
| `version.json` | version publiée et historique |

Règles de pondération des sources : `programme` > `candidat` > `proche`.

## Mise à jour

1. Une veille (manuelle ou par IA) propose des ajouts : nouvelles déclarations, programmes, candidats.
2. `tools/crawl.py` télécharge les pages d'un programme dans `corpus/<candidat>/` ; `tools/c.py` recherche des passages ; `tools/gen.py` vérifie chaque citation mot pour mot dans le corpus avant d'écrire `positions.json`.
3. Un humain relit les propositions avec `tools/relecture.html`, puis `tools/apply_relecture.py` passe leur `statut` de `propose` à `valide` (voir « Relecture des positions »).
4. Incrémenter `data/version.json` et ajouter une ligne d'historique : modifier les questions change la comparabilité des résultats.

Le dossier `corpus/` n'est pas versionné.

## Compteur de simulations

`js/config.js` : renseigner `COUNTER_URL` avec un service qui répond `{"total": n}` en GET et incrémente en POST. Vide, le compteur est masqué. Aucune réponse n'est transmise.

## Statistiques anonymes (facultatif)

Voir `tools/nas-server/README.md` : serveur Docker pour NAS (statistiques anonymes brouillées, formulaire de contact, tableau de bord privé), relié par un tunnel Cloudflare. Désactivé tant que `STATS_URL` est vide dans `js/config.js`.

## Questions d'actualité

Quelques questions hors radar portent sur un sujet récent qui a fait réagir des candidats de camps différents. Chacune a une date `jusqu_au` dans `tools/build_questions.py` (dictionnaire `ACTU`) : passée cette date, le site ne la pose plus. Avant chaque mise à jour, lancer `python3 tools/check_actualite.py` : il signale les questions échues ou proches de l'échéance, moins de trois questions actives, ou des positions trop peu nombreuses / d'un seul camp. Remplacer une question = l'ajouter dans `build_questions.py` et `gen.py` (positions citées et vérifiées), puis relancer les deux scripts.

## Relecture des positions

Ouvrir `tools/relecture.html` (serveur local : `python3 -m http.server`, puis `/tools/relecture.html`). La page présente les questions une à une : énoncé et contexte à valider ou reformuler, puis chaque position citée (citation, niveau de source, lien) à valider, corriger (nouveau score) ou rejeter. Les décisions restent dans le navigateur ; « Exporter » produit `relecture.json`, à placer dans `data/`. Ensuite : `python3 tools/apply_relecture.py` (option `--dry` pour simuler) passe les positions en `valide`, applique les corrections, archive les rejets dans `data/positions_rejetees.json` et liste les questions à reformuler (à reporter dans `tools/build_questions.py`). Le script est idempotent : le relancer après tout `tools/gen.py`.

## Skill de mise à jour

`.claude/skills/maj-elysee/SKILL.md` décrit la procédure de veille et de mise à jour (candidats déclarés, programmes, positions citées, questions d'actualité) pour Claude Code : règles de sourcing, étapes, tests, compte rendu. On l'invoque avec `/maj-elysee`.
