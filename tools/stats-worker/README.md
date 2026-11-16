# Statistiques anonymes (facultatif)

Service de comptage réservé à l'éditeur, destiné à **améliorer les questions** (formulations floues, questions peu discriminantes, abandon par série). Ce n'est pas un instrument de mesure de l'opinion : l'échantillon est auto-sélectionné.

## Garanties techniques

- **Accord explicite.** Rien n'est envoyé tant que l'utilisateur n'a pas coché la case (décochée par défaut). La case apparaît seulement si `STATS_URL` est renseigné dans `js/config.js`.
- **Compteurs uniquement.** Le navigateur envoie `{q, a}` (question, réponse) et le numéro de série atteint. Pas d'identifiant, pas d'ensemble de réponses d'une personne, pas de score de proximité, pas d'horodatage plus fin que le jour.
- **Réponse randomisée.** Avec la probabilité `STATS_P` (0,25 par défaut), la réponse envoyée est tirée au hasard parmi les 6 possibles. Aucune réponse individuelle n'est donc fiable, mais les totaux se redressent exactement : `vrai = (observé − p·N/6) / (1 − p)`.
- **Aucune adresse IP conservée.** Le code ne lit jamais l'adresse du client ; `observability` est désactivée dans `wrangler.toml`. Cloudflare voit techniquement les requêtes (comme tout hébergeur) ; ne pas activer Logpush ni de journaux.
- **Une seule table de compteurs** (`counters`), sans ligne par utilisateur.

## Déploiement (compte Cloudflare dédié, sans lien avec votre identité)

```bash
npm install -g wrangler
wrangler login
wrangler d1 create elysee2027-stats      # copier le database_id dans wrangler.toml
wrangler d1 execute elysee2027-stats --remote --file=schema.sql
# éditer wrangler.toml : ALLOWED_ORIGIN = l'adresse de votre site
wrangler secret put ADMIN_TOKEN           # un jeton long et aléatoire
wrangler deploy
```

Puis, dans `js/config.js` : `STATS_URL: 'https://elysee2027-stats.<compte>.workers.dev'`.

Conseils : ajouter une règle de limitation de débit (Cloudflare → Sécurité → Règles) sur `/hit`, par exemple 30 requêtes par minute et par adresse. Cette limitation est faite par Cloudflare, sans que le service ne stocke d'adresse.

## Lire les résultats

Ouvrir `dashboard.html` (servi par un petit serveur local : `python3 -m http.server` depuis la racine du dépôt, puis `/tools/stats-worker/dashboard.html`). Renseigner l'adresse du service et le jeton. Le tableau redresse le brouillage, affiche une marge d'erreur et signale les questions à reformuler.

## Règles d'usage (à ne pas contourner)

1. **Ne jamais publier ni transmettre** ces chiffres (réseaux sociaux, presse, clients, employeur) : un résultat diffusé relèverait de la loi sur les sondages et de vos propres engagements publics.
2. **Ne jamais croiser** ces compteurs avec d'autres données (adresses, comptes, visiteurs).
3. Si vous modifiez ce dispositif, mettre à jour avant l'activation la page « Mentions légales et confidentialité » et l'avertissement.
4. Pour des données d'opinion, une relecture par un spécialiste du RGPD est recommandée avant l'ouverture au public.
