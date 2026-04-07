import {
  ANNOUNCEMENTS_BANNER_QUERY_KEY,
  fetchPublicAnnouncementsForBanner,
  pickBannerAnnouncement,
  useAnnouncementsRealtime,
  useSupabase,
  type AnnouncementRow,
} from '@wokthai/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDismissedAnnouncementId, setDismissedAnnouncementId } from '../lib/announcementDismiss';

const SLIDE_MS = 280;

function bannerColors(type: AnnouncementRow['type']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (type) {
    case 'warning':
      return { bg: '#431407', border: '#ea580c', text: '#ffedd5' };
    case 'promo':
      return { bg: '#14532d', border: '#22c55e', text: '#dcfce7' };
    case 'important':
      return { bg: '#450a0a', border: '#ef4444', text: '#fecaca' };
    case 'info':
    default:
      return { bg: '#172554', border: '#3b82f6', text: '#dbeafe' };
  }
}

export function GlobalAnnouncementBanner() {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [closing, setClosing] = useState(false);

  useAnnouncementsRealtime(Platform.OS !== 'web');

  const query = useQuery({
    queryKey: [...ANNOUNCEMENTS_BANNER_QUERY_KEY],
    queryFn: () => fetchPublicAnnouncementsForBanner(supabase),
    staleTime: 20_000,
  });

  useEffect(() => {
    void getDismissedAnnouncementId().then((id) => {
      setDismissedId(id);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    void getDismissedAnnouncementId().then(setDismissedId);
  }, [query.dataUpdatedAt]);

  const announcement = useMemo(() => {
    const rows = query.data ?? [];
    return pickBannerAnnouncement(rows, new Date());
  }, [query.data]);

  const showBanner = Boolean(
    hydrated && announcement && !query.isError && (announcement.id !== dismissedId || closing)
  );

  useEffect(() => {
    if (!showBanner || closing) return;
    translateY.setValue(-120);
    Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_MS,
      useNativeDriver: true,
    }).start();
  }, [showBanner, closing, translateY]);

  const onDismiss = useCallback(() => {
    if (!announcement || closing) return;
    setClosing(true);
    Animated.timing(translateY, {
      toValue: -120,
      duration: SLIDE_MS,
      useNativeDriver: true,
    }).start(async () => {
      await setDismissedAnnouncementId(announcement.id);
      setDismissedId(announcement.id);
      setClosing(false);
    });
  }, [announcement, closing, translateY]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void getDismissedAnnouncementId().then(setDismissedId);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (Platform.OS === 'web') {
    return null;
  }

  if (!announcement || !showBanner) {
    return null;
  }

  const colors = bannerColors(announcement.type);
  const paddingTop = Math.max(insets.top, 8);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          paddingTop,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.message, { color: colors.text }]}>{announcement.message}</Text>
        <Pressable
          onPress={() => void onDismiss()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fermer l’annonce"
          style={styles.closeBtn}
        >
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    marginTop: -2,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
