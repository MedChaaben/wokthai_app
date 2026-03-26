import type { AllowedCity } from '../types';
import type { DeliveryZoneRow } from '../types';

export const ALLOWED_CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

export function assertDeliveryCity(city: string): city is AllowedCity {
  return ALLOWED_CITIES.includes(city as AllowedCity);
}

/** Frais pour un magasin et une ville (première zone correspondante) */
export function getDeliveryFeeForStoreAndCity(
  storeId: string,
  city: AllowedCity,
  zones: Pick<DeliveryZoneRow, 'store_id' | 'city' | 'delivery_fee'>[]
): number {
  const row = zones.find((z) => z.store_id === storeId && z.city === city);
  if (!row) return 0;
  return Number(row.delivery_fee);
}
