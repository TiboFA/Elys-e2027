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
window.E2027_CONFIG = {
  COUNTER_URL: '',
  CONTACT_URL: '',
  CONTACT_SERVICE: '',
  HOST_INFO: '',
  LICENCE: ''
};
