import { haversineKm } from './haversine';
import type { StoreRow } from '../types';

export function assignNearestStore(
  customerLat: number,
  customerLng: number,
  stores: Pick<StoreRow, 'id' | 'lat' | 'lng' | 'is_active'>[]
): StoreRow['id'] | null {
  const active = stores.filter((s) => s.is_active);
  if (active.length === 0) return null;
  let best = active[0];
  let bestD = haversineKm(customerLat, customerLng, best.lat, best.lng);
  for (let i = 1; i < active.length; i++) {
    const s = active[i];
    const d = haversineKm(customerLat, customerLng, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.id;
}
