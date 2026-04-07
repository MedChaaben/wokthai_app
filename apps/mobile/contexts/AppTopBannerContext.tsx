import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type AppTopBannerContextValue = {
  announcementVisible: boolean;
  setAnnouncementVisible: (visible: boolean) => void;
  ongoingOrderVisible: boolean;
  setOngoingOrderVisible: (visible: boolean) => void;
};

const AppTopBannerContext = createContext<AppTopBannerContextValue | null>(null);

export function AppTopBannerProvider({ children }: { children: ReactNode }) {
  const [announcementVisible, setAnnouncementVisibleState] = useState(false);
  const [ongoingOrderVisible, setOngoingOrderVisibleState] = useState(false);

  const setAnnouncementVisible = useCallback((visible: boolean) => {
    setAnnouncementVisibleState(visible);
  }, []);

  const setOngoingOrderVisible = useCallback((visible: boolean) => {
    setOngoingOrderVisibleState(visible);
  }, []);

  const value = useMemo(
    () => ({
      announcementVisible,
      setAnnouncementVisible,
      ongoingOrderVisible,
      setOngoingOrderVisible,
    }),
    [announcementVisible, ongoingOrderVisible, setAnnouncementVisible, setOngoingOrderVisible]
  );

  return <AppTopBannerContext.Provider value={value}>{children}</AppTopBannerContext.Provider>;
}

export function useAppTopBanner(): AppTopBannerContextValue {
  const ctx = useContext(AppTopBannerContext);
  if (!ctx) {
    throw new Error('useAppTopBanner must be used within AppTopBannerProvider');
  }
  return ctx;
}
