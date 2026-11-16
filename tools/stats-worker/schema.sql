-- Une seule table de compteurs : aucune ligne par utilisateur, aucun identifiant.
CREATE TABLE IF NOT EXISTS counters (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0
);
