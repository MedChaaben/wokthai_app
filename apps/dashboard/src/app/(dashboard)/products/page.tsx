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
import { Modal } from "../../../components/Modal";

export default function ProductsPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
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

  const categoriesWithProducts = useMemo(
    () => cats.filter((c) => (productsByCategory.get(c.id)?.length ?? 0) > 0),
    [cats, productsByCategory]
  );

  useEffect(() => {
    if (categoriesWithProducts.length === 0) {
      setActiveCategoryId(null);
      return;
    }
    const ok = activeCategoryId && categoriesWithProducts.some((c) => c.id === activeCategoryId);
    if (!ok) setActiveCategoryId(categoriesWithProducts[0].id);
  }, [categoriesWithProducts, activeCategoryId]);

  const visibleProducts =
    activeCategoryId != null ? (productsByCategory.get(activeCategoryId) ?? []) : [];

  if (products.isLoading || categories.isLoading) {
    return <p className="text-zinc-400">Chargement…</p>;
  }
  if (products.error || categories.error) {
    return <p className="text-red-600">{(products.error ?? categories.error)?.message}</p>;
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
          <h1 className="text-2xl font-extrabold text-zinc-100">Produits</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            L’ordre d’affichage dans l’app mobile suit le champ <span className="font-medium">Position</span> (plus
            petit en premier) par catégorie. Les onglets de catégories suivent la page{" "}
            <span className="font-medium">Catégories</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="shrink-0 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Nouveau produit
        </button>
      </div>

      <h2 className="mt-8 text-lg font-bold text-zinc-100">Menu</h2>

      {allProducts.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-center text-zinc-500">
          Aucun produit pour le moment. Cliquez sur <span className="font-semibold">Nouveau produit</span> pour en
          ajouter un.
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoriesWithProducts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryId(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategoryId === c.id
                    ? "bg-orange-950/50 text-orange-900 ring-1 ring-orange-900/40"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {c.name}
                <span className="ml-1.5 text-xs font-medium opacity-80">
                  ({productsByCategory.get(c.id)?.length ?? 0})
                </span>
              </button>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {visibleProducts.map((p) => (
              <ProductListRow key={p.id} product={p} categories={cats} onDelete={() => deleteMut.mutate(p.id)} />
            ))}
          </ul>
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
              <label className="text-sm font-semibold text-zinc-300">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-300">Prix (TND)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-300">Catégorie</label>
            <select
              value={categoryId || cats[0]?.id}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-300">Position dans la catégorie</label>
            <input
              type="number"
              value={productPosition}
              onChange={(e) => setProductPosition(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-zinc-700 px-3 py-2"
            />
            <p className="mt-1 text-xs text-zinc-500">Plus petit = affiché plus haut dans le menu (même catégorie).</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-300">Image</label>
            <input ref={fileRef} type="file" accept="image/*" className="mt-1 block w-full text-sm" />
          </div>
          {createMut.error ? (
            <p className="text-sm text-red-600">
              {createMut.error instanceof Error ? createMut.error.message : "Erreur"}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Créer le produit
            </button>
            <button
              type="button"
              disabled={createMut.isPending}
              onClick={cancelCreateForm}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 font-semibold text-zinc-200 hover:bg-zinc-950 disabled:opacity-50"
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
      className={`rounded-xl border bg-zinc-900 p-4 shadow-sm ${
        isEditing ? "border-orange-900/50 ring-1 ring-orange-900/40" : "border-zinc-800"
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
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
            Pas d’image
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {!isEditing ? (
            <>
              <div>
                <p className="text-lg font-bold text-zinc-100">{product.name}</p>
                {product.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{product.description}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-zinc-600">Pas de description</p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-300">
                <p>
                  <span className="font-semibold text-zinc-400">Prix : </span>
                  {Number(product.price).toFixed(2)} TND
                </p>
                <p>
                  <span className="font-semibold text-zinc-400">Catégorie : </span>
                  {categoryLabel}
                </p>
                <p>
                  <span className="font-semibold text-zinc-400">Position : </span>
                  {product.position}
                </p>
                <p>
                  <span className="font-semibold text-zinc-400">Vente : </span>
                  {product.is_available ? (
                    <span className="text-emerald-700">Disponible</span>
                  ) : (
                    <span className="text-amber-800">Indisponible</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={beginEdit}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer ce produit ?")) onDelete();
                  }}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                >
                  Supprimer
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">Édition en cours</p>
              <div>
                <label className="text-xs font-semibold text-zinc-400">Nom</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2 text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2 text-zinc-100"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Prix (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 w-32 rounded-xl border border-zinc-700 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Catégorie</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 min-w-[10rem] rounded-xl border border-zinc-700 px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Position (ordre dans la catégorie)</label>
                  <input
                    type="number"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="mt-1 w-24 rounded-xl border border-zinc-700 px-3 py-2"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  Disponible à la vente
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400">Nouvelle image (optionnel)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-zinc-400"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setImagePreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : null;
                    });
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={save.isPending || !name.trim()}
                  onClick={() => save.mutate()}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {save.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={cancelEdit}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200"
                >
                  Annuler
                </button>
              </div>
              {save.isError ? (
                <p className="text-sm text-red-600">
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
