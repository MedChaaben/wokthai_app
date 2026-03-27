import { phoneStorageToDisplay } from './normalizeCustomerPhone';
import type { OrderCustomerSummary } from '../types';

function hasText(s: string | null | undefined): boolean {
  return s != null && String(s).trim() !== '';
}

/** True si aucune info d’identification exploitable. */
export function isCustomerSummaryEmpty(u: OrderCustomerSummary | null | undefined): boolean {
  if (u == null) return true;
  return (
    !hasText(u.first_name) &&
    !hasText(u.last_name) &&
    !hasText(u.email) &&
    !hasText(u.phone)
  );
}

/** Libellé principal pour afficher le client (nom, sinon email, sinon téléphone). */
export function formatCustomerDisplayName(u: OrderCustomerSummary | null | undefined): string {
  const fn = u?.first_name?.trim();
  const ln = u?.last_name?.trim();
  const name = [fn, ln].filter(Boolean).join(' ');
  if (name) return name;
  const email = u?.email?.trim();
  const phone = u?.phone != null && String(u.phone).trim() !== '' ? phoneStorageToDisplay(u.phone) : '';
  if (email) return email;
  if (phone) return phone;
  return 'Non renseigné';
}
