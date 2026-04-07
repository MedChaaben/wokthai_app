/** Même forme que `Region` de react-native-maps, sans importer le package (incompatible web). */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const CENTER = { latitude: 36.8065, longitude: 10.1815 } as const;

/** Zoom utilisé dans le modal plein écran */
export const REGION_MODAL: MapRegion = {
  ...CENTER,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

/** Aperçu miniature avant tout point choisi */
export const REGION_PREVIEW_EMPTY: MapRegion = {
  ...CENTER,
  latitudeDelta: 0.07,
  longitudeDelta: 0.07,
};

/**
 * Point cartographique réellement défini (pas null/undefined, pas le couple 0,0 souvent stocké par défaut).
 */
export function isValidMapCoords(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/** Région pour la mini-carte (avec ou sans point) */
export function regionForPreview(lat: number | null, lng: number | null): MapRegion {
  if (isValidMapCoords(lat, lng)) {
    return {
      latitude: lat!,
      longitude: lng!,
      latitudeDelta: 0.014,
      longitudeDelta: 0.014,
    };
  }
  return REGION_PREVIEW_EMPTY;
}
