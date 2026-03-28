import type { StoreOpeningHourRow } from '../types';

/** 1 = lundi … 7 = dimanche (ISO) */
export const STORE_OPENING_DAY_LABELS: Record<number, string> = {
  1: 'Lun.',
  2: 'Mar.',
  3: 'Mer.',
  4: 'Jeu.',
  5: 'Ven.',
  6: 'Sam.',
  7: 'Dim.',
};

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;

/** "HH:MM:SS" ou "HH:MM" → "HHhMM" */
export function formatStoreTimeFr(isoOrTime: string): string {
  const part = isoOrTime.slice(0, 5);
  const [h, m] = part.split(':');
  if (h == null || m == null) return isoOrTime;
  return `${h}h${m}`;
}

/** Empreinte des créneaux d’un jour (pour regrouper les jours identiques). */
function slotsScheduleKey(slots: StoreOpeningHourRow[]): string {
  if (slots.length === 0) return '';
  return slots
    .map((s) => `${s.open_time.slice(0, 8)}_${s.close_time.slice(0, 8)}`)
    .join('|');
}

function formatDayRangeLabel(startDay: number, endDay: number): string {
  const a = STORE_OPENING_DAY_LABELS[startDay];
  const b = STORE_OPENING_DAY_LABELS[endDay];
  if (startDay === endDay) return a;
  return `${a} – ${b}`;
}

function buildByDaySorted(hours: StoreOpeningHourRow[]): Map<number, StoreOpeningHourRow[]> {
  const byDay = new Map<number, StoreOpeningHourRow[]>();
  for (const d of DAYS_ORDER) byDay.set(d, []);
  for (const row of hours) {
    const list = byDay.get(row.day_of_week);
    if (list) list.push(row);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.open_time.localeCompare(b.open_time));
  }
  return byDay;
}

/**
 * Texte multi-lignes pour affichage sous un point de vente : jours consécutifs aux mêmes horaires regroupés (ex. Lun. – Ven.).
 */
export function formatStoreOpeningHoursLines(
  hours: StoreOpeningHourRow[] | null | undefined
): { lines: string[]; isEmpty: boolean } {
  if (!hours?.length) {
    return {
      lines: ['Horaires non indiqués — contactez le restaurant si besoin.'],
      isEmpty: true,
    };
  }

  const byDay = buildByDaySorted(hours);
  const lines: string[] = [];
  let i = 0;
  while (i < DAYS_ORDER.length) {
    const start = DAYS_ORDER[i];
    const slots = byDay.get(start) ?? [];
    const key = slotsScheduleKey(slots);
    let j = i;
    while (
      j + 1 < DAYS_ORDER.length &&
      slotsScheduleKey(byDay.get(DAYS_ORDER[j + 1]) ?? []) === key
    ) {
      j++;
    }
    const end = DAYS_ORDER[j];
    const label = formatDayRangeLabel(start, end);
    if (slots.length === 0) {
      lines.push(`${label} · fermé`);
    } else {
      const ranges = slots.map(
        (s) => `${formatStoreTimeFr(s.open_time)} – ${formatStoreTimeFr(s.close_time)}`
      );
      lines.push(`${label} · ${ranges.join(', ')}`);
    }
    i = j + 1;
  }
  return { lines, isEmpty: false };
}
