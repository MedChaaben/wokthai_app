"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "primary";
  isPending?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  variant = "danger",
  isPending = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={isPending ? () => {} : onClose} title={title} maxWidthClassName="max-w-md">
      <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 ${
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
              : "bg-wt-bordeaux hover:bg-wt-bordeaux-hover dark:bg-wt-accent dark:hover:bg-wt-accent-hover"
          }`}
        >
          {isPending ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
