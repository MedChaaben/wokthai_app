import type { Database } from './database';

export type { Database };

export type UserRow = Database['public']['Tables']['users']['Row'];
export type AddressRow = Database['public']['Tables']['addresses']['Row'];
export type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
export type AddressUpdate = Database['public']['Tables']['addresses']['Update'];
export type StoreRow = Database['public']['Tables']['stores']['Row'];
export type StaffRow = Database['public']['Tables']['staff']['Row'];

/** Profil staff avec magasin joint (select Supabase). */
export type StaffProfileRow = StaffRow & {
  stores: Pick<StoreRow, 'name' | 'city'> | null;
};
export type CategoryRow = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type DeliveryZoneRow = Database['public']['Tables']['delivery_zones']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
export type ProductOptionGroupRow = Database['public']['Tables']['product_option_groups']['Row'];
export type ProductOptionRow = Database['public']['Tables']['product_options']['Row'];
export type OrderItemOptionRow = Database['public']['Tables']['order_item_options']['Row'];
export type OrderItemOptionInsert = Database['public']['Tables']['order_item_options']['Insert'];

/** Ligne de commande avec produit et options (réponse Supabase détail). */
export type OrderItemDetail = {
  id: string;
  quantity: number;
  unit_price: string | number;
  products: Pick<ProductRow, 'name' | 'image_url' | 'description'> | null;
  order_item_options: Pick<OrderItemOptionRow, 'option_name' | 'price_modifier'>[] | null;
};

/** Événement d’historique de statut (timeline). */
export type OrderStatusEventRow = Pick<
  Database['public']['Tables']['order_status_events']['Row'],
  'status' | 'created_at'
>;

/** Commande avec magasin, adresse et lignes (fetchOrderById enrichi). */
export type OrderDetailRow = OrderRow & {
  stores: Pick<StoreRow, 'id' | 'name' | 'address' | 'city'> | null;
  addresses: Pick<AddressRow, 'label' | 'address' | 'city' | 'instructions'> | null;
  order_items: OrderItemDetail[] | null;
  order_status_events: OrderStatusEventRow[] | null;
};

/** Liste staff : commande avec client, adresse livraison et magasin (retrait). */
export type OrderListRow = OrderRow & {
  users: Pick<UserRow, 'phone' | 'email'> | null;
  addresses: Pick<AddressRow, 'label' | 'address' | 'city'> | null;
  stores: Pick<StoreRow, 'name' | 'address' | 'city'> | null;
};

export type OrderType = Database['public']['Enums']['order_type'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];

export type AllowedCity = 'Tunis' | 'Ariana';

/** Choix d’options pour une ligne (ids issus de la base au moment de la commande). */
export type OrderLineOptionChoice = {
  groupId: string;
  optionId: string;
};

export type CartLine = {
  /** Clé stable : même produit + mêmes options = fusion des quantités. */
  lineKey: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  selectedOptions: OrderLineOptionChoice[];
  /** Libellés du type « Groupe : option » (affichage panier). */
  optionSummary?: string[];
};

export type CreateOrderLineInput = {
  productId: string;
  quantity: number;
  selectedOptions: OrderLineOptionChoice[];
};

export type CreateOrderInput = {
  type: OrderType;
  /** Magasin choisi par le client (livraison ou à emporter). */
  storeId: string;
  lines: CreateOrderLineInput[];
  paymentStatus: PaymentStatus;
  addressId: string | null;
  deliveryNotes: string | null;
  /** Requis si type === 'delivery' : ville de l’adresse (frais de livraison) */
  addressCity?: AllowedCity;
};
