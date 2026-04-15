/** Dernière mise à jour affichée en tête du document. À ajuster lors des révisions légales. */
export const CGU_LAST_UPDATED = '28 mars 2026';

export type CguSection = { title: string; paragraphs: string[] };

/**
 * Texte des CGU — à faire valider par un conseil si besoin.
 * Contact / société : compléter selon votre structure juridique.
 */
export const CGU_SECTIONS: CguSection[] = [
  {
    title: '1. Objet et acceptation',
    paragraphs: [
      'Les présentes Conditions générales d’utilisation (« CGU ») régissent l’accès et l’utilisation de l’application mobile Wokthai (l’« Application »), proposée dans le cadre de la commande de plats auprès du restaurant Wokthai (Marsa et Ennasr, Tunisie). L’éditeur de l’Application est la société SOCIETE RAYMAR, SARL (identifiant unique 1599773V) — voir les mentions légales dans l’Application.',
      'En créant un compte, en passant une commande ou en utilisant l’Application, vous reconnaissez avoir pris connaissance des présentes CGU et les accepter sans réserve. Si vous n’acceptez pas ces conditions, veuillez ne pas utiliser l’Application.',
    ],
  },
  {
    title: '2. Services',
    paragraphs: [
      'L’Application permet notamment de consulter la carte, composer un panier, renseigner des adresses de livraison, créer et gérer un compte utilisateur, et passer des commandes selon les modalités indiquées au moment de la commande (disponibilité des plats, horaires, zones desservies).',
      'Le restaurant se réserve le droit de modifier le menu, les prix, les horaires ou les zones de livraison. Les informations affichées au moment de la validation de la commande font foi, sous réserve d’erreur manifeste.',
    ],
  },
  {
    title: '3. Compte utilisateur',
    paragraphs: [
      'Vous vous engagez à fournir des informations exactes et à les maintenir à jour. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.',
      'Vous pouvez demander la suppression de votre compte et des données associées depuis l’application (Compte › modifier le profil, lien « Supprimer mon compte » en bas de page), sous réserve des obligations légales de conservation éventuelles.',
      'Le restaurant peut suspendre ou supprimer un compte en cas de violation des présentes CGU, d’usage frauduleux ou d’atteinte aux droits de tiers.',
    ],
  },
  {
    title: '4. Commandes et paiement',
    paragraphs: [
      'Toute commande validée via l’Application vaut engagement de paiement selon les moyens proposés au moment du paiement (en ligne ou autre modalité indiquée).',
      'Le restaurant peut refuser ou annuler une commande en cas d’indisponibilité, de force majeure, d’erreur de prix manifeste ou de problème de paiement. Vous serez informé dans la mesure du possible et tout montant déjà prélevé fera l’objet d’un remboursement ou d’un avoir selon les pratiques en vigueur.',
    ],
  },
  {
    title: '5. Livraison et retrait',
    paragraphs: [
      'Les délais et modalités de livraison ou de retrait sont communiqués lors de la commande ou par le restaurant. Un retard ou une impossibilité de livraison ne saurait engager une indemnité au-delà du remboursement de la commande concernée lorsque la faute est établie.',
      'Vous vous engagez à fournir une adresse et des instructions de livraison correctes. En cas d’absence ou d’impossibilité de remise, les conditions applicables (nouvelle tentative, frais, annulation) sont celles précisées par le restaurant au moment de la commande.',
    ],
  },
  {
    title: '6. Données personnelles',
    paragraphs: [
      'Les données collectées via l’Application sont traitées pour la gestion des comptes, des commandes, de la livraison et, le cas échéant, de la relation client. Le traitement est fondé sur l’exécution du contrat et l’intérêt légitime du restaurant, dans le respect de la réglementation applicable.',
      'Pour plus de détails sur les finalités, la durée de conservation et vos droits (accès, rectification, opposition, etc.), consultez la politique de confidentialité disponible dans l’application (menu Compte), ou contactez directement l’établissement.',
    ],
  },
  {
    title: '7. Propriété intellectuelle',
    paragraphs: [
      'L’Application, son contenu (textes, visuels, marques, logos) et les éléments fournis par le restaurant sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou exploitation non autorisée est interdite.',
    ],
  },
  {
    title: '8. Limitation de responsabilité',
    paragraphs: [
      'L’Application est fournie « en l’état ». Le restaurant s’efforce d’en assurer la disponibilité mais ne garantit pas l’absence d’interruptions, d’erreurs ou de bugs.',
      'Dans les limites autorisées par la loi, la responsabilité du restaurant ne saurait être engagée pour des dommages indirects ou pour des faits imposables à un tiers ou à une cause étrangère (réseau, opérateur, etc.).',
    ],
  },
  {
    title: '9. Modification des CGU',
    paragraphs: [
      'Le restaurant peut modifier les présentes CGU. La date de dernière mise à jour est indiquée en haut du document dans l’Application. L’utilisation de l’Application après publication des modifications vaut acceptation des CGU ainsi mises à jour, sauf disposition contraire.',
    ],
  },
  {
    title: '10. Droit applicable et litiges',
    paragraphs: [
      'Les présentes CGU sont régies par le droit en vigueur en Tunisie. En l’absence de règlement amiable, les tribunaux compétents seront ceux du ressort du siège social ou de l’établissement concerné, sous réserve des dispositions d’ordre public.',
    ],
  },
  {
    title: '11. Contact',
    paragraphs: [
      'Pour toute question relative aux présentes CGU ou à l’Application, vous pouvez contacter le restaurant Wokthai (coordonnées disponibles sur le site, en établissement ou sur les supports de communication du restaurant).',
    ],
  },
];
