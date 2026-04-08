"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCategories,
  useProducts,
  useProductOptionGroups,
  useStaffProfile,
  useSupabase,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@wokthai/shared";
import type { ProductRow as ProductRowType } from "@wokthai/shared";
import Link from "next/link";
import { Modal } from "../../../components/Modal";
import { ProductOptionsEditor } from "../../../components/ProductOptionsEditor";

/** Alignée sur la page Commandes : compense le padding du <main>, z-20 au-dessus de la liste. */
const CATEGORY_PILLS_STICKY =
  "sticky -top-4 z-20 -mx-4 mt-4 border-b border-stone-200/90 bg-background/95 px-4 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:border-zinc-800 md:-top-8 md:-mx-8 md:px-8 md:pb-4 md:pt-3";

export default function ProductsPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const staff = useStaffProfile();
  const isPlatformAdmin = staff.data?.role === "platform_admin";
  /** Seul le siège modifie le catalogue ; le magasin consulte les plats et gère les commandes ailleurs. */
  const canEditCatalog = staff.data?.role === "platform_admin";
  const products = useProducts({ onlyAvailable: false });
  const categories = useCategories();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productPosition, setProductPosition] = useState("0");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      const cid = categoryId || categories.data?.[0]?.id;
      if (!cid) throw new Error("Aucune catégorie");
      let imageUrl: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
      return createProduct(supabase, {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        category_id: cid,
        image_url: imageUrl,
        is_available: true,
        position: parseInt(productPosition, 10) || 0,
      });
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setPrice("");
      setProductPosition("0");
      setShowCreateForm(false);
      if (fileRef.current) fileRef.current.value = "";
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(supabase, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const cats = categories.data ?? [];
  const allProducts = products.data ?? [];

  const productsByCategory = useMemo(() => {
    const map = new Map<string, ProductRowType[]>();
    for (const p of allProducts) {
      const arr = map.get(p.category_id) ?? [];
      arr.push(p);
      map.set(p.category_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [allProducts]);

  useEffect(() => {
    queueMicrotask(() => {
      if (cats.length === 0) {
        setActiveCategoryId(null);
        return;
      }
      const ok = activeCategoryId && cats.some((c) => c.id === activeCategoryId);
      if (!ok) setActiveCategoryId(cats[0].id);
    });
  }, [cats, activeCategoryId]);

  const visibleProducts =
    activeCategoryId != null ? (productsByCategory.get(activeCategoryId) ?? []) : [];

  if (products.isLoading || categories.isLoading) {
    return <p className="text-stone-600 dark:text-zinc-400">Chargement…</p>;
  }
  if (products.error || categories.error) {
    return (
      <p className="text-red-600 dark:text-red-400">{(products.error ?? categories.error)?.message}</p>
    );
  }

  function openCreateForm() {
    if (!canEditCatalog) return;
    if (activeCategoryId) setCategoryId(activeCategoryId);
    setShowCreateForm(true);
  }

  function cancelCreateForm() {
    setShowCreateForm(false);
    setName("");
    setDescription("");
    setPrice("");
    setProductPosition("0");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Produits</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-zinc-400">
            {canEditCatalog ? (
              <>
                Grille des plats ci-dessous. Options du plat : <span className="font-medium text-zinc-800 dark:text-zinc-200">Modifier</span> sur chaque fiche.
                Ordre dans la catégorie : champ <span className="font-medium">Position</span> (plus petit = plus haut).
                {!staff.isLoading && isPlatformAdmin ? (
                  <>
                    {" "}
                    Catégories, relances et préréglages : menu latéral <span className="font-medium">Produits</span>.
                  </>
                ) : null}
              </>
            ) : (
              <>
                Consultation du menu du restaurant. Les plats et leurs personnalisations sont gérés par le <span className="font-semibold">siège</span>. Pour les
                commandes, utilisez la section <span className="font-semibold">Commandes</span>.
              </>
            )}
          </p>
        </div>
        {canEditCatalog ? (
          <button
            type="button"
            onClick={openCreateForm}
            className="shrink-0 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wt-bordeaux-hover"
          >
            Nouveau produit
          </button>
        ) : null}
      </div>

      <h2 className="mt-8 text-lg font-bold text-zinc-900 dark:text-zinc-100">Menu</h2>

      {cats.length === 0 ? (
        <p className="mt-6 wt-dashed-empty text-stone-600 dark:text-zinc-500">
          {isPlatformAdmin ? (
            <>
              Créez d’abord une <span className="font-semibold">catégorie</span> dans{" "}
              <Link
                href="/products/onglets"
                className="font-semibold text-wt-bordeaux underline decoration-wt-bordeaux/40 underline-offset-2 hover:decoration-wt-bordeaux dark:text-wt-accent"
              >
                Catégories du menu
              </Link>{" "}
              (barre latérale), puis revenez ici pour ajouter des produits.
            </>
          ) : (
            <>
              Aucune catégorie pour ce restaurant : le catalogue des onglets est géré par le <span className="font-semibold">siège</span>. Contactez
              Wok Thaï pour créer des catégories, puis vous pourrez ajouter des plats ici.
            </>
          )}
        </p>
      ) : allProducts.length === 0 ? (
        <>
          <div className={CATEGORY_PILLS_STICKY} aria-label="Catégories du menu">
            <div className="flex gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryId(c.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeCategoryId === c.id
                      ? "bg-wt-bordeaux-muted text-wt-bordeaux ring-1 ring-wt-bordeaux/30 dark:bg-wt-bordeaux/25 dark:text-white dark:ring-wt-bordeaux/50"
                      : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {c.name}
                  <span className="ml-1.5 text-xs font-medium opacity-80">(0)</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-6 wt-dashed-empty text-stone-600 dark:text-zinc-500">
            {canEditCatalog ? (
              <>
                Aucun produit pour le moment. Cliquez sur <span className="font-semibold">Nouveau produit</span> pour en
                ajouter un dans la catégorie sélectionnée.
              </>
            ) : (
              <>Aucun produit dans cette catégorie pour le moment.</>
            )}
          </p>
        </>
      ) : (
        <>
          <div className={CATEGORY_PILLS_STICKY} aria-label="Catégories du menu">
            <div className="flex gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryId(c.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeCategoryId === c.id
                      ? "bg-wt-bordeaux-muted text-wt-bordeaux ring-1 ring-wt-bordeaux/30 dark:bg-wt-bordeaux/25 dark:text-white dark:ring-wt-bordeaux/50"
                      : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {c.name}
                  <span className="ml-1.5 text-xs font-medium opacity-80">
                    ({productsByCategory.get(c.id)?.length ?? 0})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <p className="mt-6 wt-dashed-empty text-stone-600 dark:text-zinc-500">
              {canEditCatalog ? (
                <>
                  Aucun produit dans cette catégorie. Utilisez <span className="font-semibold">Nouveau produit</span> pour en
                  ajouter un.
                </>
              ) : (
                <>Aucun produit dans cette catégorie.</>
              )}
            </p>
          ) : (
            <ul className="relative z-0 mt-6 space-y-3">
              {visibleProducts.map((p) => (
                <ProductListRow
                  key={p.id}
                  product={p}
                  categories={cats}
                  readOnly={!canEditCatalog}
                  onDelete={() => deleteMut.mutate(p.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {canEditCatalog ? (
      <Modal
        open={showCreateForm}
        onClose={cancelCreateForm}
        title="Nouveau produit"
        maxWidthClassName="max-w-2xl"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMut.mutate();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Prix (TND)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Catégorie</label>
            <select
              value={categoryId || cats[0]?.id}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Position dans la catégorie</label>
            <input
              type="number"
              value={productPosition}
              onChange={(e) => setProductPosition(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
            />
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">Plus petit = affiché plus haut dans le menu (même catégorie).</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Image</label>
            <input ref={fileRef} type="file" accept="image/*" className="mt-1 block w-full text-sm" />
          </div>
          {createMut.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {createMut.error instanceof Error ? createMut.error.message : "Erreur"}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-xl bg-wt-bordeaux px-4 py-2 font-semibold text-white hover:bg-wt-bordeaux-hover disabled:opacity-50"
            >
              Créer le produit
            </button>
            <button
              type="button"
              disabled={createMut.isPending}
              onClick={cancelCreateForm}
              className="rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-950 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </Modal>
      ) : null}
    </div>
  );
}

function ProductOptionsViewer({ productId }: { productId: string }) {
  const tree = useProductOptionGroups(productId);
  if (tree.isLoading) {
    return <p className="mt-4 text-sm text-stone-600 dark:text-zinc-500">Chargement des personnalisations…</p>;
  }
  if (tree.error) {
    return null;
  }
  const groups = tree.data ?? [];
  if (groups.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 border-t border-stone-200 pt-4 dark:border-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Personnalisations</p>
      <ul className="mt-2 space-y-3">
        {groups.map((g) => (
          <li key={g.id} className="rounded-lg border border-stone-200/90 bg-stone-50/60 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {g.name}
              <span className="ml-2 font-normal text-stone-600 dark:text-zinc-400">
                · {g.required ? "Obligatoire" : "Facultatif"} ·{" "}
                {g.max_select === 1 ? "un seul choix" : `jusqu’à ${g.max_select} choix`}
              </span>
            </p>
            <ul className="mt-1.5 space-y-0.5 pl-2 text-sm text-stone-700 dark:text-zinc-300">
              {g.product_options.map((o) => (
                <li key={o.id}>
                  {o.name}
                  {o.is_chargeable && Number(o.price_modifier) !== 0 ? (
                    <span className="text-stone-500 dark:text-zinc-500">
                      {" "}
                      ({Number(o.price_modifier) > 0 ? "+" : ""}
                      {Number(o.price_modifier).toFixed(2)} TND)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductListRow({
  product,
  categories,
  readOnly = false,
  onDelete,
}: {
  product: ProductRowType;
  categories: { id: string; name: string }[];
  readOnly?: boolean;
  onDelete: () => void;
}) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(Number(product.price).toFixed(2));
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [position, setPosition] = useState(String(product.position));
  const [isAvailable, setIsAvailable] = useState(product.is_available);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function resetFormFromProduct() {
    setName(product.name);
    setDescription(product.description ?? "");
    setPrice(Number(product.price).toFixed(2));
    setCategoryId(product.category_id);
    setPosition(String(product.position));
    setIsAvailable(product.is_available);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    if (readOnly) setIsEditing(false);
  }, [readOnly]);

  useEffect(() => {
    if (isEditing) return;
    queueMicrotask(() => {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(Number(product.price).toFixed(2));
      setCategoryId(product.category_id);
      setPosition(String(product.position));
      setIsAvailable(product.is_available);
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (fileRef.current) fileRef.current.value = "";
    });
  }, [product, isEditing]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const save = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null | undefined = product.image_url;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
      return updateProduct(supabase, product.id, {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        category_id: categoryId,
        position: parseInt(position, 10) || 0,
        is_available: isAvailable,
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
      });
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = "";
      setImagePreview(null);
      setIsEditing(false);
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  function beginEdit() {
    resetFormFromProduct();
    setIsEditing(true);
  }

  function cancelEdit() {
    resetFormFromProduct();
    setIsEditing(false);
  }

  const displayImage = imagePreview ?? product.image_url;
  const categoryLabel = categories.find((c) => c.id === product.category_id)?.name ?? "—";

  return (
    <li
      className={`wt-card p-4 ${
        !readOnly && isEditing
          ? "border-wt-bordeaux ring-2 ring-wt-bordeaux/35 dark:border-wt-bordeaux dark:ring-wt-bordeaux/40"
          : ""
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt=""
            className="h-28 w-28 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg wt-inset text-xs">
            Pas d’image
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {readOnly || !isEditing ? (
            <>
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{product.name}</p>
                {product.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600 dark:text-zinc-400">{product.description}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-stone-600 dark:text-zinc-400">Pas de description</p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                <p>
                  <span className="font-semibold text-stone-600 dark:text-zinc-400">Prix : </span>
                  {Number(product.price).toFixed(2)} TND
                </p>
                <p>
                  <span className="font-semibold text-stone-600 dark:text-zinc-400">Catégorie : </span>
                  {categoryLabel}
                </p>
                <p>
                  <span className="font-semibold text-stone-600 dark:text-zinc-400">Position : </span>
                  {product.position}
                </p>
                <p>
                  <span className="font-semibold text-stone-600 dark:text-zinc-400">Vente : </span>
                  {product.is_available ? (
                    <span className="text-emerald-700 dark:text-emerald-400">Disponible</span>
                  ) : (
                    <span className="text-amber-800 dark:text-amber-400">Indisponible</span>
                  )}
                </p>
              </div>
              {readOnly ? (
                <ProductOptionsViewer productId={product.id} />
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="rounded-xl bg-wt-bordeaux px-4 py-2 text-sm font-semibold text-white hover:bg-wt-bordeaux-hover"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Supprimer ce produit ?")) onDelete();
                    }}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900/60 dark:text-red-400"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
                Édition en cours
              </p>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Nom</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Prix (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 w-32 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Catégorie</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 min-w-[10rem] rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Position (ordre dans la catégorie)</label>
                  <input
                    type="number"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="mt-1 w-24 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  Disponible à la vente
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Nouvelle image (optionnel)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-stone-600 dark:text-zinc-400"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setImagePreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : null;
                    });
                  }}
                />
              </div>
              <ProductOptionsEditor productId={product.id} />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={save.isPending || !name.trim()}
                  onClick={() => save.mutate()}
                  className="rounded-xl bg-wt-bordeaux px-4 py-2 text-sm font-semibold text-white hover:bg-wt-bordeaux-hover disabled:opacity-50"
                >
                  {save.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={cancelEdit}
                  className="rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Annuler
                </button>
              </div>
              {save.isError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {save.error instanceof Error ? save.error.message : "Erreur à l’enregistrement"}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

