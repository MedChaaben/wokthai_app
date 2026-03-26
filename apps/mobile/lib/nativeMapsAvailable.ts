import { Platform, UIManager } from 'react-native';

/** `react-native-maps` n’est pas dans Expo Go : les vues AIRMap* ne sont pas enregistrées. */
export function isNativeMapsAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return (
      typeof UIManager.hasViewManagerConfig === 'function' &&
      UIManager.hasViewManagerConfig('AIRMap')
    );
  } catch {
    return false;
  }
}
