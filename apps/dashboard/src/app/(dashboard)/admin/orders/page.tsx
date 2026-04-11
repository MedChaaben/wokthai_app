"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  useOrders,
  useStaffProfile,
  useAdminOrdersRealtime,
  fetchAllStores,
  useSupabase,
} from "@wokthai/shared";
import { OrdersCommandCenter } from "@/components/OrdersCommandCenter";

export default function AdminOrdersPage() {
  const staff = useStaffProfile();
  const supabase = useSupabase();
  const isAdmin = staff.data?.role === "platform_admin";

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    enabled: Boolean(isAdmin),
  });

  const [storeFilter, setStoreFilter] = useState<string>("");
  const storeIdForQuery = storeFilter || null;

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
      onStoreFilterChange={setStoreFilter}
    />
  );
}
