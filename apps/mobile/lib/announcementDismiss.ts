import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wokthai:announcement_dismissed_id';

export async function getDismissedAnnouncementId(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function setDismissedAnnouncementId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Réaffiche le bandeau pour cette annonce (ex. après tap sur une notification). */
export async function clearAnnouncementDismissalForId(announcementId: string): Promise<void> {
  try {
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    if (current === announcementId) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
