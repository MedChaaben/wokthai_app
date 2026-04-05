/** Dernière mise à jour affichée en tête du document. */
export const PRIVACY_LAST_UPDATED = '28 mars 2026';

export type PrivacySection = { title: string; paragraphs: string[] };

/**
 * Politique de confidentialité — à faire valider par un conseil si besoin.
 * Compléter l’identité du responsable du traitement (raison sociale, contact DPO si applicable).
 */
export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Responsable du traitement',
    paragraphs: [
      'Le responsable du traitement des données personnelles collectées via l’application mobile Wok Thai est la société SOCIETE RAYMAR, SARL, immatriculée sous l’identifiant unique 1599773V, dont le siège social est situé au 50, rue Taieb Mhiri, 2078 La Marsa, Tunisie, exploitant l’enseigne Wok Thai (établissements Marsa et Ennasr).',
      'Pour toute question relative à cette politique ou à vos données, vous pouvez contacter le restaurant aux coordonnées communiquées sur vos supports habituels (site, réseaux sociaux, téléphone en magasin) ou l’éditeur à l’adresse du siège social (voir également les mentions légales dans l’application).',
    ],
  },
  {
    title: '2. Données collectées',
    paragraphs: [
      'Données de compte et d’identification : adresse email, mot de passe (géré de façon sécurisée par notre prestataire d’authentification), prénom, nom, numéro de téléphone lorsque vous les renseignez.',
      'Données de commande et de livraison : contenu du panier, adresses de livraison enregistrées (adresse, ville, coordonnées géographiques approximatives si vous les utilisez sur la carte), consignes de livraison saisies au moment de la commande.',
      'Données techniques : identifiants techniques liés à l’appareil ou à la session, journaux techniques nécessaires au bon fonctionnement et à la sécurité du service (via nos prestataires d’hébergement et d’infrastructure).',
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: [
      'Création et gestion de votre compte utilisateur ; authentification et sécurité.',
      'Prise, préparation, suivi et livraison des commandes ; communication avec vous sur le statut de la commande lorsque cela est nécessaire.',
      'Respect des obligations légales et comptables ; gestion des litiges éventuels.',
      'Amélioration du service et mesures de sécurité (détection d’abus, maintenance), dans la mesure permise par la loi.',
    ],
  },
  {
    title: '4. Base légale',
    paragraphs: [
      'Le traitement repose notamment sur l’exécution du contrat (commande, livraison, compte client), l’intérêt légitime du restaurant (sécurité, amélioration du service, lutte contre la fraude) et, le cas échéant, l’obligation légale.',
    ],
  },
  {
    title: '5. Prestataires et hébergement',
    paragraphs: [
      'Nous faisons appel à des prestataires techniques pour héberger les données et fournir l’authentification et la base de données (par exemple Supabase et l’infrastructure associée). Ces acteurs traitent des données uniquement sur nos instructions et dans le cadre contractuel prévu.',
      'Les données peuvent être stockées ou transiter via des serveurs situés dans l’Union européenne ou dans d’autres pays offrant un niveau de protection reconnu ou des garanties appropriées, selon la configuration du prestataire. Les informations détaillées figurent dans la documentation du prestataire concerné.',
    ],
  },
  {
    title: '6. Durée de conservation',
    paragraphs: [
      'Les données de compte et de profil sont conservées pendant la durée d’utilisation de votre compte, puis supprimées ou anonymisées dans un délai raisonnable après suppression du compte, sous réserve des obligations légales de conservation (par exemple conservation de pièces comptables).',
      'Les données liées aux commandes peuvent être conservées sous une forme permettant de respecter les obligations légales et comptables, même après suppression de votre compte, sans lien avec votre identité lorsque la suppression du compte a été effectuée conformément à notre procédure.',
    ],
  },
  {
    title: '7. Vos droits',
    paragraphs: [
      'Selon la loi applicable, vous pouvez disposer d’un droit d’accès, de rectification, d’effacement, de limitation du traitement, d’opposition et de portabilité lorsque ces droits sont prévus.',
      'Pour les demandes relatives à votre compte, vous pouvez utiliser les fonctions prévues dans l’application (par ex. modification du profil, suppression du compte via le lien en bas de l’écran Modifier le profil). Pour d’autres demandes, contactez le restaurant en précisant votre identité.',
      'Vous pouvez introduire une réclamation auprès de l’autorité de protection des données compétente si vous estimez que vos droits ne sont pas respectés.',
    ],
  },
  {
    title: '8. Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre l’accès non autorisé, la perte ou l’altération. Aucun système n’étant infaillible, nous ne pouvons garantir une sécurité absolue.',
    ],
  },
  {
    title: '9. Notifications',
    paragraphs: [
      'Si l’application envoie des notifications push ou des emails (confirmation de compte, suivi de commande, etc.), elles sont limitées aux besoins du service. Vous pouvez désactiver les notifications au niveau des réglages de votre téléphone pour l’application.',
    ],
  },
  {
    title: '10. Mineurs',
    paragraphs: [
      'L’application s’adresse aux personnes capables de contracter. Si vous estimez qu’un mineur a fourni des données sans autorisation, contactez-nous afin que nous puissions prendre les mesures appropriées.',
    ],
  },
  {
    title: '11. Évolution de la politique',
    paragraphs: [
      'Nous pouvons modifier la présente politique pour refléter l’évolution du service ou des obligations légales. La date de dernière mise à jour est indiquée en haut du document dans l’application. Nous vous invitons à la consulter régulièrement.',
    ],
  },
];
