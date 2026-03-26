import type { Region } from 'react-native-maps';

const CENTER = { latitude: 36.8065, longitude: 10.1815 } as const;

/** Zoom utilisé dans le modal plein écran */
export const REGION_MODAL: Region = {
  ...CENTER,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

/** Aperçu miniature avant tout point choisi */
export const REGION_PREVIEW_EMPTY: Region = {
  ...CENTER,
  latitudeDelta: 0.07,
  longitudeDelta: 0.07,
};

/** Région pour la mini-carte (avec ou sans point) */
export function regionForPreview(lat: number | null, lng: number | null): Region {
  if (lat != null && lng != null) {
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.014,
      longitudeDelta: 0.014,
    };
  }
  return REGION_PREVIEW_EMPTY;
}
