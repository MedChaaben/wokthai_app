export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderTypeEnum = 'delivery' | 'pickup';
export type OrderStatusEnum =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';
export type PaymentStatusEnum = 'unpaid' | 'paid_on_delivery';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; phone: string | null; email: string | null; created_at: string };
        Insert: { id: string; phone?: string | null; email?: string | null; created_at?: string };
        Update: { id?: string; phone?: string | null; email?: string | null; created_at?: string };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address: string;
          city: string;
          lat: number;
          lng: number;
          instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          address: string;
          city: string;
          lat: number;
          lng: number;
          instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address?: string;
          city?: string;
          lat?: number;
          lng?: number;
          instructions?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          address: string;
          city: string;
          lat: number;
          lng: number;
          is_active: boolean;
          prep_time_minutes: number;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          city: string;
          lat: number;
          lng: number;
          is_active?: boolean;
          prep_time_minutes?: number;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          city?: string;
          lat?: number;
          lng?: number;
          is_active?: boolean;
          prep_time_minutes?: number;
        };
        Relationships: [];
      };
      staff: {
        Row: { id: string; user_id: string; email: string; store_id: string };
        Insert: { id?: string; user_id: string; email: string; store_id: string };
        Update: { id?: string; user_id?: string; email?: string; store_id?: string };
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; position: number };
        Insert: { id?: string; name: string; position?: number };
        Update: { id?: string; name?: string; position?: number };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: string;
          category_id: string;
          image_url: string | null;
          is_available: boolean;
          position: number;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number | string;
          category_id: string;
          image_url?: string | null;
          is_available?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number | string;
          category_id?: string;
          image_url?: string | null;
          is_available?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          city: string;
          delivery_fee: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          city: string;
          delivery_fee?: number | string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          city?: string;
          delivery_fee?: number | string;
        };
        Relationships: [];
      };
      drivers: {
        Row: { id: string; name: string; phone: string; is_active: boolean };
        Insert: { id?: string; name: string; phone: string; is_active?: boolean };
        Update: { id?: string; name?: string; phone?: string; is_active?: boolean };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          type: OrderTypeEnum;
          status: OrderStatusEnum;
          payment_status: PaymentStatusEnum;
          total_price: string;
          address_id: string | null;
          delivery_notes: string | null;
          estimated_delivery_time: string | null;
          driver_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          type: OrderTypeEnum;
          status?: OrderStatusEnum;
          payment_status?: PaymentStatusEnum;
          total_price: number | string;
          address_id?: string | null;
          delivery_notes?: string | null;
          estimated_delivery_time?: string | null;
          driver_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          type?: OrderTypeEnum;
          status?: OrderStatusEnum;
          payment_status?: PaymentStatusEnum;
          total_price?: number | string;
          address_id?: string | null;
          delivery_notes?: string | null;
          estimated_delivery_time?: string | null;
          driver_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number | string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number | string;
        };
        Relationships: [];
      };
      product_option_groups: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          required: boolean;
          max_select: number;
          position: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          required?: boolean;
          max_select?: number;
          position?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          required?: boolean;
          max_select?: number;
          position?: number;
        };
        Relationships: [];
      };
      product_options: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          price_modifier: string;
          position: number;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          price_modifier?: number | string;
          position?: number;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          price_modifier?: number | string;
          position?: number;
        };
        Relationships: [];
      };
      order_item_options: {
        Row: {
          id: string;
          order_item_id: string;
          option_name: string;
          price_modifier: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          option_name: string;
          price_modifier?: number | string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          option_name?: string;
          price_modifier?: number | string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_type: OrderTypeEnum;
      order_status: OrderStatusEnum;
      payment_status: PaymentStatusEnum;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
