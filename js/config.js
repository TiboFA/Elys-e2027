// Configuration du site.
// COUNTER_URL : adresse d'un service de comptage (facultatif).
//   GET  -> renvoie {"total": 1234}
//   POST -> incrémente le total et renvoie le même format
// Laisser vide pour masquer le compteur. Aucune réponse de l'utilisateur n'est transmise.
//
// CONTACT_URL : adresse du service qui reçoit le formulaire de contact (facultatif).
//   Le formulaire envoie un POST JSON {objet, question, message, email, page} avec l'en-tête
//   Accept: application/json (format compatible avec Formspree et services équivalents).
//   Votre adresse électronique n'apparaît jamais dans le site : elle reste chez le service.
//   Laisser vide tant que le service n'est pas configuré : le formulaire l'indique.
//
// CONTACT_SERVICE : nom du service de réception, affiché dans la page de confidentialité (ex. 'Formspree').
// HOST_INFO : coordonnées de l'hébergeur affichées dans les mentions légales (GitHub par défaut).
// LICENCE : licence du code et de la méthode (ex. 'MIT pour le code, CC BY-SA 4.0 pour les données').
// STATS_URL : adresse du service de statistiques anonymes (voir tools/stats-worker). Vide = désactivé :
//   aucune case de consentement n'est alors affichée et rien n'est envoyé.
// STATS_P : part des réponses remplacées au hasard avant envoi (0.25 par défaut).
window.E2027_CONFIG = {
  STATS_URL: '',
  STATS_P: 0.25,
  COUNTER_URL: '',
  CONTACT_URL: '',
  CONTACT_SERVICE: '',
  HOST_INFO: '',
  LICENCE: ''
};
