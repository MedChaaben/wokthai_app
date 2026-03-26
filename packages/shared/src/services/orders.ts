import { assertDeliveryCity, getDeliveryFeeForStoreAndCity } from '../domain/delivery';
import { validateLineOptionsAndPrice } from '../domain/order-line-options';
import type { WokthaiSupabaseClient } from '../supabase/client';
import type {
  CreateOrderInput,
  OrderDetailRow,
  OrderItemDetail,
  OrderListRow,
  OrderRow,
  OrderStatusEventRow,
} from '../types';
import { isCustomerSummaryEmpty } from '../domain/customer-display';
import { fetchActiveStores } from './stores';
import { fetchDeliveryZones } from './delivery-zones';
import { fetchOptionTreesForProducts } from './product-options';
import { fetchProductBasePrices } from './products-pricing';

export async function fetchMyOrders(client: WokthaiSupabaseClient): Promise<OrderRow[]> {
  const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function normalizeOrderListRow(raw: OrderListRow): OrderListRow {
  return {
    ...raw,
    users: asSingle(
      raw.users as OrderListRow['users'] | OrderListRow['users'][] | null | undefined
    ),
    addresses: asSingle(
      raw.addresses as OrderListRow['addresses'] | OrderListRow['addresses'][] | null | undefined
    ),
    stores: asSingle(raw.stores as OrderListRow['stores'] | OrderListRow['stores'][] | null | undefined),
  };
}

export async function fetchOrdersForStore(
  client: WokthaiSupabaseClient,
  storeId: string
): Promise<OrderListRow[]> {
  const { data, error } = await client
    .from('orders')
    .select(
      `
      *,
      users!orders_user_id_fkey ( phone, email, first_name, last_name ),
      addresses!orders_address_id_fkey ( label, address, city ),
      stores!orders_store_id_fkey ( name, address, city )
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as OrderListRow[];
  const normalized = rows.map(normalizeOrderListRow);

  const { data: custRows, error: rpcErr } = await client.rpc('staff_customers_for_store_orders', {
    p_store_id: storeId,
  });
  if (rpcErr) throw rpcErr;
  const byOrderId = new Map(
    (custRows ?? []).map((r) => [
      r.order_id,
      {
        phone: r.phone,
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
      },
    ])
  );

  return normalized.map((row) => ({
    ...row,
    users: byOrderId.get(row.id) ?? row.users,
  }));
}

function asSingle<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalizeOrderDetail(raw: OrderDetailRow): OrderDetailRow {
  const stores = asSingle(
    raw.stores as OrderDetailRow['stores'] | OrderDetailRow['stores'][] | null | undefined
  );
  const addresses = asSingle(
    raw.addresses as OrderDetailRow['addresses'] | OrderDetailRow['addresses'][] | null | undefined
  );
  const users = asSingle(
    raw.users as OrderDetailRow['users'] | OrderDetailRow['users'][] | null | undefined
  );
  const items = raw.order_items ?? [];
  const rawEvents = raw.order_status_events ?? [];
  const eventsList = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
  const sorted = [...eventsList]
    .filter((e): e is OrderStatusEventRow => e != null && typeof e === 'object' && 'status' in e && 'created_at' in e)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const order_status_events: OrderStatusEventRow[] =
    sorted.length > 0 ? sorted : [{ status: raw.status, created_at: raw.created_at }];
  return {
    ...raw,
    stores,
    addresses,
    users,
    order_status_events,
    order_items: items.map((line) => ({
      ...line,
      products: asSingle(
        line.products as OrderItemDetail['products'] | OrderItemDetail['products'][] | null | undefined
      ),
      order_item_options: line.order_item_options ?? [],
    })),
  };
}

type RpcDeliveryAddress = {
  label: string;
  address: string;
  city: string;
  instructions: string | null;
};

/**
 * Adresse de livraison : l’embed PostgREST `addresses!…` est souvent vide pour le **staff**
 * (RLS sur `addresses` : le client est propriétaire de la ligne, pas le restaurateur).
 * La RPC `order_delivery_address` contourne ce blocage en vérifiant les droits côté SQL.
 */
export async function fetchOrderById(
  client: WokthaiSupabaseClient,
  orderId: string
): Promise<OrderDetailRow | null> {
  const { data, error } = await client
    .from('orders')
    .select(
      `
      *,
      users!orders_user_id_fkey ( phone, email, first_name, last_name ),
      stores!orders_store_id_fkey ( id, name, address, city ),
      addresses!orders_address_id_fkey ( label, address, city, instructions ),
      order_items (
        id,
        quantity,
        unit_price,
        products!order_items_product_id_fkey ( name, image_url, description ),
        order_item_options ( option_name, price_modifier )
      ),
      order_status_events ( status, created_at )
    `
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let detail = normalizeOrderDetail(data as unknown as OrderDetailRow);

  if (detail.type === 'delivery' && detail.address_id && !detail.addresses) {
    const { data: addrRows, error: rpcErr } = await client.rpc('order_delivery_address', {
      p_order_id: orderId,
    });
    if (!rpcErr && addrRows && Array.isArray(addrRows) && addrRows.length > 0) {
      const addr = addrRows[0] as RpcDeliveryAddress;
      detail = {
        ...detail,
        addresses: {
          label: addr.label,
          address: addr.address,
          city: addr.city,
          instructions: addr.instructions,
        },
      };
    }
  }

  if (isCustomerSummaryEmpty(detail.users)) {
    const { data: custRows, error: custErr } = await client.rpc('staff_customer_for_order', {
      p_order_id: orderId,
    });
    if (!custErr && custRows && Array.isArray(custRows) && custRows.length > 0) {
      const u = custRows[0];
      detail = {
        ...detail,
        users: {
          phone: u.phone,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
        },
      };
    }
  }

  return detail;
}

export async function updateOrderStatus(
  client: WokthaiSupabaseClient,
  orderId: string,
  status: OrderRow['status']
): Promise<OrderRow> {
  const { data, error } = await client
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

type PreparedLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
  snapshots: { option_name: string; price_modifier: number }[];
};

function subtotalFromPrepared(lines: PreparedLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

export async function createOrderWithItems(
  client: WokthaiSupabaseClient,
  input: CreateOrderInput
): Promise<{ order: OrderRow }> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Non authentifié');

  if (input.lines.length === 0) throw new Error('Panier vide');
  if (!input.storeId?.trim()) throw new Error('Magasin requis');

  const productIds = input.lines.map((l) => l.productId);
  const [stores, zones, priceMap, treeMap] = await Promise.all([
    fetchActiveStores(client),
    fetchDeliveryZones(client),
    fetchProductBasePrices(client, productIds),
    fetchOptionTreesForProducts(client, productIds),
  ]);

  const prepared: PreparedLine[] = [];
  for (const line of input.lines) {
    const base = priceMap.get(line.productId);
    if (base == null) throw new Error('Produit introuvable');
    const groups = treeMap.get(line.productId) ?? [];
    const { unitPrice, snapshots } = validateLineOptionsAndPrice(
      base,
      groups,
      line.selectedOptions ?? []
    );
    prepared.push({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice,
      snapshots,
    });
  }

  const activeIds = new Set(stores.map((s) => s.id));
  if (!activeIds.has(input.storeId)) {
    throw new Error('Magasin invalide ou inactif');
  }
  const storeId = input.storeId;

  let deliveryFee = 0;
  if (input.type === 'delivery') {
    if (!input.addressId) throw new Error('Adresse de livraison requise');
    if (!input.addressCity || !assertDeliveryCity(input.addressCity)) {
      throw new Error('Livraison uniquement à Tunis ou Ariana');
    }
    deliveryFee = getDeliveryFeeForStoreAndCity(storeId, input.addressCity, zones);
  }

  const itemsTotal = subtotalFromPrepared(prepared);
  const total = itemsTotal + (input.type === 'delivery' ? deliveryFee : 0);

  const orderInsert = {
    user_id: userId,
    store_id: storeId,
    type: input.type,
    status: 'pending' as const,
    payment_status: input.paymentStatus,
    total_price: total,
    address_id: input.type === 'delivery' ? input.addressId : null,
    delivery_notes: input.deliveryNotes,
    estimated_delivery_time: null as string | null,
    driver_id: null as string | null,
  };

  const { data: order, error: orderErr } = await client.from('orders').insert(orderInsert).select().single();
  if (orderErr) throw orderErr;

  const itemRows = prepared.map((p) => ({
    order_id: order.id,
    product_id: p.productId,
    quantity: p.quantity,
    unit_price: p.unitPrice,
  }));

  const { data: insertedItems, error: itemsErr } = await client
    .from('order_items')
    .insert(itemRows)
    .select('id');
  if (itemsErr) throw itemsErr;
  if (!insertedItems || insertedItems.length !== prepared.length) {
    throw new Error('Insertion des lignes de commande incomplète');
  }

  const optionRows = insertedItems.flatMap((row, i) =>
    prepared[i].snapshots.map((s) => ({
      order_item_id: row.id,
      option_name: s.option_name,
      price_modifier: s.price_modifier,
    }))
  );

  if (optionRows.length > 0) {
    const { error: optErr } = await client.from('order_item_options').insert(optionRows);
    if (optErr) throw optErr;
  }

  return { order };
}
