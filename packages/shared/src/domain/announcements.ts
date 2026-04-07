import type { AnnouncementRow } from '../types';

/** Fenêtre temporelle optionnelle (dates ISO côté Supabase, comparées en instant UTC). */
export function isAnnouncementInDateWindow(
  row: Pick<AnnouncementRow, 'start_at' | 'end_at'>,
  now: Date = new Date()
): boolean {
  if (row.start_at) {
    const start = new Date(row.start_at);
    if (Number.isFinite(start.getTime()) && now < start) return false;
  }
  if (row.end_at) {
    const end = new Date(row.end_at);
    if (Number.isFinite(end.getTime()) && now > end) return false;
  }
  return true;
}

/** Tri affichage bandeau : priorité décroissante, puis plus récent. */
export function compareAnnouncementsForBanner(a: AnnouncementRow, b: AnnouncementRow): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/**
 * Choisit l’annonce à afficher parmi des lignes déjà filtrées (ex. RLS).
 * Re-vérifie is_active + fenêtre de dates côté client pour robustesse.
 */
export function pickBannerAnnouncement(
  rows: AnnouncementRow[],
  now: Date = new Date()
): AnnouncementRow | null {
  const eligible = rows.filter(
    (r) => r.is_active && isAnnouncementInDateWindow(r, now)
  );
  if (eligible.length === 0) return null;
  eligible.sort(compareAnnouncementsForBanner);
  return eligible[0] ?? null;
}
