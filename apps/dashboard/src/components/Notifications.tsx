"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type NotificationVariant = "success" | "error" | "info";

type NotificationInput = {
  message: string;
  durationMs?: number;
  variant?: NotificationVariant;
};

type NotificationItem = {
  id: string;
  message: string;
  durationMs: number;
  variant: NotificationVariant;
};

type NotificationsContextValue = {
  notify: (input: NotificationInput) => string;
  success: (message: string, durationMs?: number) => string;
  error: (message: string, durationMs?: number) => string;
  info: (message: string, durationMs?: number) => string;
  dismiss: (id: string) => void;
};

const DEFAULT_DURATION_MS = 4200;

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function variantStyles(variant: NotificationVariant): string {
  if (variant === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
  if (variant === "error") {
    return "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100";
  }
  return "border-stone-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
}

function NotificationToast({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  const remainingMsRef = useRef(item.durationMs);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (startedAtRef.current == null) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    startedAtRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    if (remainingMsRef.current <= 0) {
      onDismiss(item.id);
      return;
    }
    startedAtRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      startedAtRef.current = null;
      onDismiss(item.id);
    }, remainingMsRef.current);
  }, [clearTimer, item.id, onDismiss]);

  useEffect(() => {
    startTimer();
    return () => {
      clearTimer();
    };
  }, [clearTimer, startTimer]);

  useEffect(() => {
    if (hovered || focusWithin) {
      pauseTimer();
      return;
    }
    startTimer();
  }, [focusWithin, hovered, pauseTimer, startTimer]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 shadow-lg ${variantStyles(item.variant)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        setFocusWithin(false);
      }}
      tabIndex={-1}
    >
      <p className="min-w-0 flex-1 text-sm font-medium">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
        aria-label="Fermer la notification"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((input: NotificationInput) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: NotificationItem = {
      id,
      message: input.message,
      durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      variant: input.variant ?? "info",
    };
    setItems((prev) => [...prev, item]);
    return id;
  }, []);

  const value = useMemo<NotificationsContextValue>(() => {
    return {
      notify,
      dismiss,
      success: (message, durationMs) => notify({ message, durationMs, variant: "success" }),
      error: (message, durationMs) => notify({ message, durationMs, variant: "error" }),
      info: (message, durationMs) => notify({ message, durationMs, variant: "info" }),
    };
  }, [dismiss, notify]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[120] flex w-full max-w-sm flex-col gap-2 sm:right-4 sm:top-4">
        {items.map((item) => (
          <NotificationToast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications doit être utilisé dans NotificationsProvider");
  }
  return ctx;
}
