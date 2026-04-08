"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  useStaffProfile,
  useAdminStaffList,
  useSupabase,
  fetchAllStores,
  type StaffListRow,
  type StaffRoleEnum,
} from "@wokthai/shared";
import { useQuery } from "@tanstack/react-query";

const ROLE_LABEL: Record<StaffRoleEnum, string> = {
  store: "Restaurant",
  platform_admin: "Siège",
};

export default function AdminStaffPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";
  const list = useAdminStaffList(Boolean(isAdmin));

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    enabled: Boolean(isAdmin),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<StaffListRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editStoreId, setEditStoreId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editOk, setEditOk] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!editRow) return;
    setEditEmail(editRow.email);
    setEditStoreId(editRow.store_id ?? "");
    setEditPassword("");
    setEditError(null);
    setEditOk(null);
  }, [editRow]);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error("Aucune ligne sélectionnée");
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnectez-vous.");

      const res = await fetch(`/api/admin/staff/${editRow.user_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editEmail.trim().toLowerCase(),
          storeId:
            editRow.role === "platform_admin" && editStoreId === "" ? null : editStoreId,
          password: editPassword,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Échec de la mise à jour");
    },
    onSuccess: () => {
      setEditError(null);
      setEditOk("Modifications enregistrées.");
      setEditPassword("");
      void qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (e: Error) => {
      setEditOk(null);
      setEditError(e.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnectez-vous.");

      const res = await fetch(`/api/admin/staff/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Échec de la suppression");
    },
    onMutate: () => setDeleteError(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnectez-vous.");

      const res = await fetch("/api/admin/invite-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim(), password, storeId }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Échec de la création du compte");
    },
    onSuccess: () => {
      setFormError(null);
      setFormOk("Compte créé. L’utilisateur peut se connecter au dashboard avec cet e-mail.");
      setEmail("");
      setPassword("");
      void qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (e: Error) => {
      setFormOk(null);
      setFormError(e.message);
    },
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Créer un accès restaurant</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          Crée un compte Supabase Auth (e-mail / mot de passe) et rattache la ligne <code className="rounded bg-stone-100 px-1 dark:bg-zinc-800">staff</code> au magasin choisi.
        </p>
        <form
          className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
          onSubmit={(e) => {
            e.preventDefault();
            setFormOk(null);
            inviteMut.mutate();
          }}
        >
          <div>
            <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="inv-email">
              E-mail
            </label>
            <input
              id="inv-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="inv-pw">
              Mot de passe initial
            </label>
            <input
              id="inv-pw"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Au moins 8 caractères ; à communiquer à l’équipe.</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="inv-store">
              Point de vente
            </label>
            <select
              id="inv-store"
              required
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">— Choisir —</option>
              {(storesQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.city}
                </option>
              ))}
            </select>
          </div>
          {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}
          {formOk ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{formOk}</p> : null}
          <button
            type="submit"
            disabled={inviteMut.isPending}
            className="rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {inviteMut.isPending ? "Création…" : "Créer le compte"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Équipe actuelle</h2>
        {deleteError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p> : null}
        {list.isLoading ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement…</p>
        ) : list.error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{list.error.message}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-zinc-800">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">E-mail</th>
                  <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">Restaurant</th>
                  <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">Rôle</th>
                  <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((row) => {
                  const isSelf = row.user_id === staff.data?.user_id;
                  return (
                    <tr key={row.id} className="border-b border-stone-100 dark:border-zinc-800/80">
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{row.email}</td>
                      <td className="px-4 py-3 text-stone-700 dark:text-zinc-300">
                        {row.stores?.name ?? "—"}
                        {row.stores?.city ? <span className="text-xs text-stone-500"> · {row.stores.city}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-stone-700 dark:text-zinc-300">{ROLE_LABEL[row.role]}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditRow(row)}
                            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || deleteMut.isPending}
                            title={isSelf ? "Impossible de supprimer votre propre compte" : undefined}
                            onClick={() => {
                              const msg =
                                row.role === "platform_admin"
                                  ? `Supprimer le compte siège ${row.email} ? L’utilisateur ne pourra plus se connecter.`
                                  : `Supprimer le compte ${row.email} ? L’utilisateur ne pourra plus se connecter.`;
                              if (!window.confirm(msg)) return;
                              deleteMut.mutate(row.user_id);
                            }}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500 dark:text-zinc-500">
          Les rôles siège se gèrent en base (<code className="rounded bg-stone-100 px-1 dark:bg-zinc-800">staff.role = platform_admin</code>), pas depuis cet écran. E-mail, mot de passe, et pour le siège un magasin optionnel (affichage catalogue) ou aucun.
        </p>
      </section>

      {editRow ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-staff-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRow(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 id="edit-staff-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Modifier le compte
            </h3>
            <p className="mt-1 break-all text-xs text-stone-500 dark:text-zinc-500">{editRow.email}</p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setEditOk(null);
                updateMut.mutate();
              }}
            >
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="edit-email">
                  E-mail
                </label>
                <input
                  id="edit-email"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="edit-store">
                  Point de vente
                </label>
                <select
                  id="edit-store"
                  required={editRow.role !== "platform_admin"}
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {editRow.role === "platform_admin" ? (
                    <option value="">Aucun (siège uniquement)</option>
                  ) : null}
                  {(storesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.city}
                    </option>
                  ))}
                </select>
                {editRow.role === "platform_admin" ? (
                  <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                    Optionnel : libellé « magasin » dans le menu latéral pour la page Produits.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200" htmlFor="edit-pw">
                  Nouveau mot de passe
                </label>
                <input
                  id="edit-pw"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Au moins 8 caractères si renseigné.</p>
              </div>
              {editError ? <p className="text-sm text-red-600 dark:text-red-400">{editError}</p> : null}
              {editOk ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{editOk}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {updateMut.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditRow(null)}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                >
                  Fermer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
