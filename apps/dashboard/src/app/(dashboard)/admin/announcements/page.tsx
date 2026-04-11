"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ANNOUNCEMENTS_ADMIN_QUERY_KEY,
  useAnnouncementsRealtime,
  useSupabase,
  fetchAllAnnouncementsAdmin,
  insertAnnouncementAdmin,
  updateAnnouncementAdmin,
  deleteAnnouncementAdmin,
  useStaffProfile,
  type AnnouncementRow,
  type AnnouncementType,
} from "@wokthai/shared";
import { ConfirmModal } from "../../../../components/ConfirmModal";
import { Modal } from "../../../../components/Modal";

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "info", label: "Info (bleu)" },
  { value: "warning", label: "Attention (orange)" },
  { value: "promo", label: "Promo" },
  { value: "important", label: "Important (rouge)" },
];

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

async function getAccessToken(supabase: ReturnType<typeof useSupabase>): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous.");
  return token;
}

async function postSendPush(announcementId: string, accessToken: string): Promise<void> {
  const res = await fetch(`/api/admin/announcements/${announcementId}/send-push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as { error?: string; detail?: string; token_count?: number };
  if (!res.ok) {
    throw new Error(body.error ?? body.detail ?? "Échec de l’envoi push (vérifiez la fonction Edge et EXPO_ACCESS_TOKEN).");
  }
}

export default function AdminAnnouncementsPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";

  useAnnouncementsRealtime(Boolean(isAdmin));

  const listQuery = useQuery({
    queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY],
    queryFn: () => fetchAllAnnouncementsAdmin(supabase),
    enabled: Boolean(isAdmin),
  });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  const [notifyPushNow, setNotifyPushNow] = useState(true);
  const [type, setType] = useState<AnnouncementType>("info");
  const [priority, setPriority] = useState("0");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editActive, setEditActive] = useState(false);
  const [editSendPush, setEditSendPush] = useState(false);
  const [editNotifyPush, setEditNotifyPush] = useState(false);
  const [editType, setEditType] = useState<AnnouncementType>("info");
  const [editPriority, setEditPriority] = useState("0");
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editEndLocal, setEditEndLocal] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editOk, setEditOk] = useState<string | null>(null);

  const [activatePushRow, setActivatePushRow] = useState<AnnouncementRow | null>(null);
  const [pushOnlyRow, setPushOnlyRow] = useState<AnnouncementRow | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<AnnouncementRow | null>(null);

  const resetCreateForm = useCallback(() => {
    setTitle("");
    setMessage("");
    setIsActive(false);
    setSendPush(false);
    setNotifyPushNow(true);
    setType("info");
    setPriority("0");
    setStartLocal("");
    setEndLocal("");
    setFormError(null);
  }, []);

  const openEdit = useCallback((row: AnnouncementRow) => {
    setEditing(row);
    setEditTitle(row.title);
    setEditMessage(row.message);
    setEditActive(row.is_active);
    setEditSendPush(row.send_push);
    setEditNotifyPush(false);
    setEditType(row.type);
    setEditPriority(String(row.priority));
    setEditStartLocal(toDatetimeLocalValue(row.start_at));
    setEditEndLocal(toDatetimeLocalValue(row.end_at));
    setEditError(null);
    setEditOk(null);
  }, []);

  const createMut = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      const m = message.trim();
      if (!t || !m) throw new Error("Titre et message sont requis.");
      const pr = Number.parseInt(priority, 10);
      if (!Number.isFinite(pr)) throw new Error("Priorité invalide (entier).");

      const row = await insertAnnouncementAdmin(supabase, {
        title: t,
        message: m,
        is_active: isActive,
        send_push: sendPush,
        type,
        priority: pr,
        start_at: fromDatetimeLocalValue(startLocal),
        end_at: fromDatetimeLocalValue(endLocal),
      });

      if (isActive && sendPush && notifyPushNow) {
        const token = await getAccessToken(supabase);
        await postSendPush(row.id, token);
      }
      return row;
    },
    onSuccess: () => {
      setFormOk("Annonce créée.");
      setFormError(null);
      resetCreateForm();
      void qc.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
    },
    onError: (e: Error) => {
      setFormOk(null);
      setFormError(e.message);
    },
  });

  const saveEditMut = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Aucune annonce sélectionnée.");
      const t = editTitle.trim();
      const m = editMessage.trim();
      if (!t || !m) throw new Error("Titre et message sont requis.");
      const pr = Number.parseInt(editPriority, 10);
      if (!Number.isFinite(pr)) throw new Error("Priorité invalide (entier).");

      const wasActive = editing.is_active;
      await updateAnnouncementAdmin(supabase, editing.id, {
        title: t,
        message: m,
        is_active: editActive,
        send_push: editSendPush,
        type: editType,
        priority: pr,
        start_at: fromDatetimeLocalValue(editStartLocal),
        end_at: fromDatetimeLocalValue(editEndLocal),
      });

      const becameActive = !wasActive && editActive;
      if (editActive && editSendPush && (becameActive || editNotifyPush)) {
        const token = await getAccessToken(supabase);
        await postSendPush(editing.id, token);
      }
    },
    onSuccess: () => {
      setEditOk("Enregistré.");
      setEditError(null);
      setEditNotifyPush(false);
      void qc.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
      void qc.invalidateQueries({ queryKey: ["announcements", "banner"] });
    },
    onError: (e: Error) => {
      setEditOk(null);
      setEditError(e.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteAnnouncementAdmin(supabase, id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
      setEditing((e) => (e ? null : e));
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: async ({
      row,
      next,
      sendPush = false,
    }: {
      row: AnnouncementRow;
      next: boolean;
      sendPush?: boolean;
    }) => {
      await updateAnnouncementAdmin(supabase, row.id, { is_active: next });
      if (next && sendPush && row.send_push) {
        const token = await getAccessToken(supabase);
        await postSendPush(row.id, token);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
    },
  });

  const pushOnlyMut = useMutation({
    mutationFn: async (row: AnnouncementRow) => {
      const token = await getAccessToken(supabase);
      await postSendPush(row.id, token);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
    },
  });

  const rows = listQuery.data ?? [];

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [rows]
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Nouvelle annonce</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Visible dans l’app dès qu’elle est active et dans les dates. La push part uniquement si vous cochez l’option et que l’annonce est active
          (ou via le bouton dédié dans la liste).
        </p>
        <form
          className="mt-4 grid max-w-2xl gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setFormOk(null);
            createMut.mutate();
          }}
        >
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Titre
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Horaires exceptionnels"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Message
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Texte affiché dans le bandeau (et corps de la notification push)."
            />
          </label>
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Activer tout de suite
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} />
              Autoriser / prévoir les notifications push
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={notifyPushNow}
                onChange={(e) => setNotifyPushNow(e.target.checked)}
                disabled={!isActive || !sendPush}
              />
              Envoyer une push maintenant (si actif + push)
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Type
              <select
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Priorité (plus élevé = prioritaire si plusieurs actives)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Début (optionnel, fuseau local du navigateur)
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Fin (optionnel)
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </label>
          </div>
          {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}
          {formOk ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{formOk}</p> : null}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="wt-btn-primary max-w-xs justify-center disabled:opacity-60"
          >
            {createMut.isPending ? "Création…" : "Créer l’annonce"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Annonces existantes</h2>
        {listQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement…</p>
        ) : listQuery.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {listQuery.error instanceof Error ? listQuery.error.message : "Erreur de chargement"}
          </p>
        ) : sortedRows.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Aucune annonce pour l’instant.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700 dark:text-zinc-300">{row.message}</p>
                    <p className="mt-2 text-xs text-stone-500 dark:text-zinc-500">
                      Type {row.type} · priorité {row.priority}
                      {row.push_last_sent_at
                        ? ` · dernière push ${new Date(row.push_last_sent_at).toLocaleString("fr-FR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        disabled={toggleActiveMut.isPending}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (next && row.send_push) {
                            setActivatePushRow(row);
                            return;
                          }
                          toggleActiveMut.mutate({ row, next, sendPush: false });
                        }}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-stone-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                      onClick={() => openEdit(row)}
                    >
                      Modifier
                    </button>
                    {row.is_active && row.send_push ? (
                      <button
                        type="button"
                        className="rounded-lg bg-wt-bordeaux px-3 py-1.5 text-xs font-semibold text-white hover:bg-wt-bordeaux-hover disabled:opacity-60"
                        disabled={pushOnlyMut.isPending}
                        onClick={() => setPushOnlyRow(row)}
                      >
                        Envoyer push
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setAnnouncementToDelete(row)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-announcement-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 id="edit-announcement-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Modifier l’annonce
            </h3>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveEditMut.mutate();
              }}
            >
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Titre
                <input
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Message
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                  Active
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={editSendPush} onChange={(e) => setEditSendPush(e.target.checked)} />
                  Push autorisé
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editNotifyPush}
                    onChange={(e) => setEditNotifyPush(e.target.checked)}
                    disabled={!editActive || !editSendPush}
                  />
                  Envoyer une push à l’enregistrement
                </label>
              </div>
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Type
                <select
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as AnnouncementType)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Priorité
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Début
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editStartLocal}
                  onChange={(e) => setEditStartLocal(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Fin
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  value={editEndLocal}
                  onChange={(e) => setEditEndLocal(e.target.value)}
                />
              </label>
              {editError ? <p className="text-sm text-red-600 dark:text-red-400">{editError}</p> : null}
              {editOk ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{editOk}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={saveEditMut.isPending} className="wt-btn-primary text-sm disabled:opacity-60">
                  {saveEditMut.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold dark:border-zinc-600"
                  onClick={() => setEditing(null)}
                >
                  Fermer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Modal
        open={activatePushRow != null}
        onClose={toggleActiveMut.isPending ? () => {} : () => setActivatePushRow(null)}
        title="Activer l’annonce"
        maxWidthClassName="max-w-md"
      >
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cette annonce est configurée pour les notifications push. Souhaitez-vous envoyer une notification à tous les appareils enregistrés maintenant ?
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
          <button
            type="button"
            disabled={toggleActiveMut.isPending}
            onClick={() => setActivatePushRow(null)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={toggleActiveMut.isPending}
            onClick={() => {
              if (!activatePushRow) return;
              toggleActiveMut.mutate({ row: activatePushRow, next: true, sendPush: false });
              setActivatePushRow(null);
            }}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Activer sans envoyer
          </button>
          <button
            type="button"
            disabled={toggleActiveMut.isPending}
            onClick={() => {
              if (!activatePushRow) return;
              toggleActiveMut.mutate({ row: activatePushRow, next: true, sendPush: true });
              setActivatePushRow(null);
            }}
            className="rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-wt-bordeaux-hover disabled:opacity-50 dark:bg-wt-accent dark:hover:bg-wt-accent-hover"
          >
            Activer et envoyer
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={pushOnlyRow != null}
        onClose={() => setPushOnlyRow(null)}
        title="Envoyer la notification push ?"
        description="Un envoi sera fait vers tous les appareils enregistrés pour les notifications."
        confirmLabel="Envoyer"
        variant="primary"
        onConfirm={() => {
          if (pushOnlyRow) pushOnlyMut.mutate(pushOnlyRow);
          setPushOnlyRow(null);
        }}
        isPending={pushOnlyMut.isPending}
      />

      <ConfirmModal
        open={announcementToDelete != null}
        onClose={() => setAnnouncementToDelete(null)}
        title="Supprimer cette annonce ?"
        description={
          announcementToDelete ? (
            <>
              L’annonce <span className="font-semibold text-zinc-800 dark:text-zinc-200">« {announcementToDelete.title} »</span> sera
              définitivement supprimée.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (announcementToDelete) {
            if (editing?.id === announcementToDelete.id) setEditing(null);
            deleteMut.mutate(announcementToDelete.id);
          }
          setAnnouncementToDelete(null);
        }}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
