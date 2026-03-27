/**
 * Aligné sur `public.normalize_customer_phone` (migration SQL).
 *
 * - Sans **+** ni **00** en tête : interprétation tunisienne (8 chiffres, 9 avec 0, ou déjà 216…).
 * - Avec **+** ou **00…** : international ; si l’indicatif n’est pas 216, la clé est la suite de chiffres
 *   (après retrait d’un préfixe 00 initial sur la chaîne de chiffres).
 */
export function isExplicitInternationalPhoneInput(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const t = raw.trim();
  return t.includes('+') || t.startsWith('00');
}

export function normalizeCustomerPhone(p: string | null | undefined): string | null {
  if (p == null) return null;
  const raw = p.trim();
  if (!raw) return null;
  const intl = isExplicitInternationalPhoneInput(raw);
  let d = raw.replace(/\D/g, '');
  if (!d) return null;

  if (intl) {
    if (d.startsWith('00')) d = d.slice(2);
    if (!d) return null;
    if (d.startsWith('216')) return d;
    return d;
  }

  if (d.length >= 11 && d.startsWith('216')) return d;
  if (d.length === 9 && d.startsWith('0')) return `216${d.slice(1)}`;
  if (d.length === 8) return `216${d}`;
  return d;
}

/** Partie nationale TN (8 chiffres typiques) → « XX XXX XXX ». */
export function formatTunisianNationalForDisplay(nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, '');
  if (d.length === 8) {
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)}`;
  }
  return d;
}

/**
 * Depuis la valeur en base : affichage sans +216 pour la Tunisie ; avec + seulement pour l’international (≠ 216).
 */
export function phoneStorageToDisplay(stored: string | null | undefined): string {
  if (stored == null || !String(stored).trim()) return '';
  const n = normalizeCustomerPhone(stored);
  if (!n) return String(stored).trim();
  if (n.startsWith('216')) {
    return formatTunisianNationalForDisplay(n.slice(3));
  }
  return `+${n}`;
}

/**
 * Ce qu’on enregistre en base : national formaté pour la TN complète ; « +chiffres » pour l’étranger.
 * Saisie tunisienne incomplète : conserve la saisie brute (évite de tronquer pendant l’édition).
 */
export function phoneDisplayToStorage(display: string): string | null {
  const raw = display.trim();
  if (!raw) return null;
  const n = normalizeCustomerPhone(raw);
  if (!n) return null;
  if (n.startsWith('216')) {
    if (n.length < 11) return raw;
    return formatTunisianNationalForDisplay(n.slice(3));
  }
  return `+${n}`;
}

/** Après blur : applique les règles d’affichage (retire +216 si TN complète). */
export function canonicalizePhoneDisplayInput(display: string): string {
  const raw = display.trim();
  if (!raw) return '';
  const n = normalizeCustomerPhone(raw);
  if (!n) return raw;
  if (n.startsWith('216')) {
    if (n.length < 11) return raw;
    return formatTunisianNationalForDisplay(n.slice(3));
  }
  return `+${n}`;
}

/** Lien `tel:` en E.164 (`+…`). */
export function phoneToTelHref(stored: string | null | undefined): string | null {
  const n = normalizeCustomerPhone(stored ?? '');
  if (!n) return null;
  return `+${n}`;
}
