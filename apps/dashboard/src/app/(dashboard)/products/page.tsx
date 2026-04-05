"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCategories,
  useProducts,
  useSupabase,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@wokthai/shared";
import type { ProductRow as ProductRowType } from "@wokthai/shared";
import { CategoryMenuManager } from "../../../components/CategoryMenuManager";
import { Modal } from "../../../components/Modal";
import { ProductOptionsEditor } from "../../../components/ProductOptionsEditor";
import { CustomizationPresetCatalogSection } from "../../../components/CustomizationPresetCatalogSection";

/** Alignée sur la page Commandes : compense le padding du <main>, z-20 au-dessus de la liste. */
const CATEGORY_PILLS_STICKY =
  "sticky -top-4 z-20 -mx-4 mt-4 border-b border-stone-200/90 bg-background/95 px-4 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:border-zinc-800 md:-top-8 md:-mx-8 md:px-8 md:pb-4 md:pt-3";

export default function ProductsPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const products = useProducts({ onlyAvailable: false });
  const categories = useCategories();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [menuTabsOpen, setMenuTabsOpen] = useState(false);
  const [presetsCatalogOpen, setPresetsCatalogOpen] = useState(false);
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
    if (cats.length === 0) {
      setActiveCategoryId(null);
      return;
    }
    const ok = activeCategoryId && cats.some((c) => c.id === activeCategoryId);
    if (!ok) setActiveCategoryId(cats[0].id);
  }, [cats, activeCategoryId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#menu-tabs") {
      setMenuTabsOpen(true);
      requestAnimationFrame(() => {
        document.getElementById("menu-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

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
            L’ordre d’affichage dans l’app mobile suit le champ <span className="font-medium">Position</span> (plus
            petit en premier) par catégorie. L’ordre des onglets et les noms de catégories se gèrent dans la section
            repliable ci-dessous. Les personnalisations du plat (piquant, avec/sans, suppléments, etc.) se configurent
            dans <span className="font-medium">Modifier</span>, en bas du formulaire d’édition. Les{' '}
            <span className="font-medium">préréglages</span> se définissent dans la section catalogue ci-dessous, puis
            s’importent sur chaque plat.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="shrink-0 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wt-bordeaux-hover"
        >
          Nouveau produit
        </button>
      </div>

      <details
        id="menu-tabs"
        open={menuTabsOpen}
        onToggle={(e) => setMenuTabsOpen((e.target as HTMLDetailsElement).open)}
        className="group mt-8 rounded-2xl border border-stone-200/90 bg-stone-50/80 dark:border-zinc-800 dark:bg-zinc-950/40"
      >
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-500">
                Navigation app
              </p>
              <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                Onglets du menu — ordre et libellés
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200/80 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700">
              {menuTabsOpen ? "Masquer" : "Afficher"}
            </span>
          </div>
        </summary>
        <div className="border-t border-stone-200/90 px-4 pb-5 pt-2 dark:border-zinc-800 sm:px-5">
          <CategoryMenuManager />
        </div>
      </details>

      <details
        id="presets-catalog"
        open={presetsCatalogOpen}
        onToggle={(e) => setPresetsCatalogOpen((e.target as HTMLDetailsElement).open)}
        className="group mt-6 rounded-2xl border border-stone-200/90 bg-stone-50/80 dark:border-zinc-800 dark:bg-zinc-950/40"
      >
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-500">
                Bibliothèque
              </p>
              <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                Catalogue de préréglages (groupes + valeurs)
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200/80 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700">
              {presetsCatalogOpen ? "Masquer" : "Afficher"}
            </span>
          </div>
        </summary>
        <div className="border-t border-stone-200/90 px-4 pb-5 pt-2 dark:border-zinc-800 sm:px-5">
          <CustomizationPresetCatalogSection />
        </div>
      </details>

      <h2 className="mt-8 text-lg font-bold text-zinc-900 dark:text-zinc-100">Menu</h2>

      {cats.length === 0 ? (
        <p className="mt-6 wt-dashed-empty text-stone-600 dark:text-zinc-500">
          Créez d’abord une <span className="font-semibold">catégorie</span> dans la section ci-dessus, puis ajoutez des
          produits.
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
            Aucun produit pour le moment. Cliquez sur <span className="font-semibold">Nouveau produit</span> pour en
            ajouter un dans la catégorie sélectionnée.
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
              Aucun produit dans cette catégorie. Utilisez <span className="font-semibold">Nouveau produit</span> pour en
              ajouter un.
            </p>
          ) : (
            <ul className="relative z-0 mt-6 space-y-3">
              {visibleProducts.map((p) => (
                <ProductListRow key={p.id} product={p} categories={cats} onDelete={() => deleteMut.mutate(p.id)} />
              ))}
            </ul>
          )}
        </>
      )}

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
    </div>
  );
}

function ProductListRow({
  product,
  categories,
  onDelete,
}: {
  product: ProductRowType;
  categories: { id: string; name: string }[];
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
    if (isEditing) return;
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
        isEditing
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
          {!isEditing ? (
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
