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
3. Un humain relit les propositions et passe leur `statut` de `propose` à `valide`.
4. Incrémenter `data/version.json` et ajouter une ligne d'historique : modifier les questions change la comparabilité des résultats.

Le dossier `corpus/` n'est pas versionné.

## Compteur de simulations

`js/config.js` : renseigner `COUNTER_URL` avec un service qui répond `{"total": n}` en GET et incrémente en POST. Vide, le compteur est masqué. Aucune réponse n'est transmise.

## Statistiques anonymes (facultatif)

Voir `tools/nas-server/README.md` : serveur Docker pour NAS (statistiques anonymes brouillées, formulaire de contact, tableau de bord privé), relié par un tunnel Cloudflare. Désactivé tant que `STATS_URL` est vide dans `js/config.js`.
