/** Dernière mise à jour affichée en tête du document. */
export const MENTIONS_LAST_UPDATED = '28 mars 2026';

export type MentionsSection = { title: string; paragraphs: string[] };

/**
 * Mentions légales — données issues du registre (identifiant unique 1599773V).
 * Compléter si besoin : capital social, RNE complet, email de contact dédié.
 */
export const MENTIONS_SECTIONS: MentionsSection[] = [
  {
    title: '1. Éditeur de l’application',
    paragraphs: [
      'L’application mobile « Wok Thai » est éditée par la société SOCIETE RAYMAR, Société à responsabilité limitée (SARL), immatriculée sous l’identifiant unique 1599773V (registre national des entreprises — état actif au moment de la rédaction de ce document).',
      'Siège social : 50, rue Taieb Mhiri, 2078 La Marsa, Tunisie.',
      'L’enseigne commerciale « Wok Thai » et les établissements (notamment Marsa et Ennasr) relèvent de l’activité de cette société.',
    ],
  },
  {
    title: '2. Directeur de la publication',
    paragraphs: [
      'Le directeur de la publication est la personne habilitée au nom de SOCIETE RAYMAR (représentant légal de la SARL).',
    ],
  },
  {
    title: '3. Hébergement et infrastructure',
    paragraphs: [
      'Les données et l’authentification sont notamment hébergées via des prestataires techniques (par exemple Supabase et l’infrastructure cloud associée). Les conditions et localisations des traitements sont détaillées dans la politique de confidentialité de l’application.',
    ],
  },
  {
    title: '4. Propriété intellectuelle',
    paragraphs: [
      'L’application, les marques, logos, textes, visuels et éléments graphiques associés sont la propriété de SOCIETE RAYMAR ou de ses partenaires et sont protégés par le droit applicable. Toute reproduction non autorisée est interdite.',
    ],
  },
  {
    title: '5. Limitation de responsabilité',
    paragraphs: [
      'L’éditeur s’efforce d’assurer l’exactitude des informations affichées dans l’application (menu, prix, disponibilité). Des erreurs ou interruptions peuvent néanmoins survenir ; l’utilisateur est invité à vérifier les informations au moment de la commande.',
    ],
  },
  {
    title: '6. Contact',
    paragraphs: [
      'Pour toute question relative aux présentes mentions légales, vous pouvez contacter SOCIETE RAYMAR à l’adresse du siège social indiquée ci-dessus ou via les coordonnées communiquées sur les supports du restaurant Wok Thai (téléphone, réseaux sociaux, site internet le cas échéant).',
    ],
  },
];
