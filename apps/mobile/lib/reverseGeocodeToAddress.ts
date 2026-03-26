import * as Location from 'expo-location';
import type { LocationGeocodedAddress } from 'expo-location';
import type { AllowedCity } from '@wokthai/shared';

export type GeocodedAddressSuggestion = {
  addressLine: string;
  city: AllowedCity | null;
};

export type MapConfirmPayload = {
  lat: number;
  lng: number;
  /** Texte + ville déduits du point (API système) ; modifiables dans le formulaire. */
  geocoded: GeocodedAddressSuggestion | null;
};

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function poolText(g: LocationGeocodedAddress): string {
  return [g.city, g.district, g.subregion, g.region, g.street, g.name]
    .filter(Boolean)
    .map((x) => stripDiacritics(String(x)).toLowerCase())
    .join(' ');
}

/** Heuristique grand Tunis : seules Tunis et Ariana sont autorisées côté app. */
export function mapGeocodedToAllowedCity(g: LocationGeocodedAddress): AllowedCity | null {
  const pool = poolText(g);
  if (/\bariana\b|aryanah|aryan|el ariana|l'ariana|l\s*ariana/.test(pool)) return 'Ariana';
  if (/\btunis\b|tunisia|manouba|ben arous|marsa|carthage|bardo|sidi bou|soukra|mutuelleville|montplaisir|lac 2|lac2|gammarth|goulette|kram|medina|djebel|jebel|oued ellil|ettadhamen|cite el khadra|kheireddine|jardins de carthage/.test(pool))
    return 'Tunis';
  if (g.isoCountryCode === 'TN') return 'Tunis';
  return null;
}

function buildAddressLine(g: LocationGeocodedAddress): string {
  const formatted = g.formattedAddress?.trim();
  if (formatted) return formatted;

  const streetPart = [g.streetNumber, g.street].filter(Boolean).join(' ').trim();
  const extra = [g.district, g.postalCode].filter(Boolean).join(' ').trim();
  const parts: string[] = [];
  if (g.name && g.name !== g.street && g.name !== streetPart) parts.push(g.name.trim());
  if (streetPart) parts.push(streetPart);
  if (extra) parts.push(extra);
  if (g.city && !parts.some((p) => p.includes(g.city!))) parts.push(g.city.trim());

  return parts.filter(Boolean).join(', ');
}

async function ensureForegroundPermissionForGeocode(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return true;
  const { status: next } = await Location.requestForegroundPermissionsAsync();
  return next === 'granted';
}

/**
 * Adresse textuelle + ville à partir de coordonnées (API système).
 * Expo exige une permission localisation pour le géocodage sur Android ; on la demande aussi sur iOS pour fiabiliser.
 */
export async function reverseGeocodeToSuggestion(
  lat: number,
  lng: number
): Promise<GeocodedAddressSuggestion | null> {
  const ok = await ensureForegroundPermissionForGeocode();
  if (!ok) return null;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const g = results[0];
    if (!g) return null;
    const addressLine = buildAddressLine(g).trim();
    const city = mapGeocodedToAllowedCity(g);
    return {
      addressLine,
      city,
    };
  } catch {
    return null;
  }
}
