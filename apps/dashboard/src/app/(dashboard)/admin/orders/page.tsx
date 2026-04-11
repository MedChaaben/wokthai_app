"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import {
  useOrders,
  useStaffProfile,
  useAdminOrdersRealtime,
  fetchAllStores,
  useSupabase,
} from "@wokthai/shared";
import { OrdersCommandCenter, OrdersCommandCenterSkeleton } from "@/components/OrdersCommandCenter";

function AdminOrdersPageInner() {
  const staff = useStaffProfile();
  const supabase = useSupabase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = staff.data?.role === "platform_admin";

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    enabled: Boolean(isAdmin),
  });

  const storeFilter = (searchParams.get("store") ?? "").trim();
  const storeIdForQuery = storeFilter || null;

  const onStoreFilterChange = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("store", id);
      else params.delete("store");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const orders = useOrders({
    mode: "admin",
    storeId: storeIdForQuery,
    enabled: Boolean(isAdmin),
  });

  useAdminOrdersRealtime(Boolean(isAdmin));

  if (!isAdmin) return null;

  return (
    <OrdersCommandCenter
      variant="admin"
      ordersQuery={orders}
      storesQuery={storesQuery}
      storeFilter={storeFilter}
      onStoreFilterChange={onStoreFilterChange}
    />
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersCommandCenterSkeleton />}>
      <AdminOrdersPageInner />
    </Suspense>
  );
}
