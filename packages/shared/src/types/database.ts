export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderTypeEnum = 'delivery' | 'pickup';
export type OrderStatusEnum =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';
export type PaymentStatusEnum = 'unpaid' | 'paid_on_delivery';
export type StaffRoleEnum = 'store' | 'platform_admin';
export type AnnouncementTypeEnum = 'info' | 'warning' | 'promo' | 'important';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          loyalty_points: number;
          promo_used: boolean;
          expo_push_token: string | null;
          expo_push_token_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          loyalty_points?: number;
          promo_used?: boolean;
          expo_push_token?: string | null;
          expo_push_token_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          loyalty_points?: number;
          promo_used?: boolean;
          expo_push_token?: string | null;
          expo_push_token_updated_at?: string | null;
          created_at?: string;
        };
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
      announcements: {
        Row: {
          id: string;
          title: string;
          message: string;
          is_active: boolean;
          send_push: boolean;
          type: AnnouncementTypeEnum;
          priority: number;
          created_at: string;
          start_at: string | null;
          end_at: string | null;
          push_last_sent_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          is_active?: boolean;
          send_push?: boolean;
          type?: AnnouncementTypeEnum;
          priority?: number;
          created_at?: string;
          start_at?: string | null;
          end_at?: string | null;
          push_last_sent_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          is_active?: boolean;
          send_push?: boolean;
          type?: AnnouncementTypeEnum;
          priority?: number;
          created_at?: string;
          start_at?: string | null;
          end_at?: string | null;
          push_last_sent_at?: string | null;
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
          /** Minutes ajoutées à l’estimation (charge cuisine). */
          kitchen_load_extra_minutes: number;
          delivery_enabled: boolean;
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
          kitchen_load_extra_minutes?: number;
          delivery_enabled?: boolean;
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
          kitchen_load_extra_minutes?: number;
          delivery_enabled?: boolean;
        };
        Relationships: [];
      };
      store_opening_hours: {
        Row: {
          id: string;
          store_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          store_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          store_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          store_id: string | null;
          role: StaffRoleEnum;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          store_id?: string | null;
          role?: StaffRoleEnum;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          store_id?: string | null;
          role?: StaffRoleEnum;
        };
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; position: number };
        Insert: { id?: string; name: string; position?: number };
        Update: { id?: string; name?: string; position?: number };
        Relationships: [];
      };
      upsell_campaigns: {
        Row: {
          id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      upsell_campaign_categories: {
        Row: {
          campaign_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          campaign_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          campaign_id?: string;
          category_id?: string;
          created_at?: string;
        };
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
      upsell_suggestions: {
        Row: {
          id: string;
          campaign_id: string;
          product_id: string;
          position: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          product_id: string;
          position?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          product_id?: string;
          position?: number;
          is_active?: boolean;
          created_at?: string;
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
          user_id: string | null;
          store_id: string;
          type: OrderTypeEnum;
          status: OrderStatusEnum;
          payment_status: PaymentStatusEnum;
          total_price: string;
          address_id: string | null;
          delivery_notes: string | null;
          estimated_delivery_time: string | null;
          driver_id: string | null;
          guest_phone: string | null;
          guest_delivery_label: string | null;
          guest_delivery_address: string | null;
          guest_delivery_city: string | null;
          guest_lat: number | null;
          guest_lng: number | null;
          delivery_promo: string | null;
          loyalty_points_credited: boolean;
          source: string;
          has_upsell: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          store_id: string;
          type: OrderTypeEnum;
          status?: OrderStatusEnum;
          payment_status?: PaymentStatusEnum;
          total_price: number | string;
          address_id?: string | null;
          delivery_notes?: string | null;
          estimated_delivery_time?: string | null;
          driver_id?: string | null;
          guest_phone?: string | null;
          guest_delivery_label?: string | null;
          guest_delivery_address?: string | null;
          guest_delivery_city?: string | null;
          guest_lat?: number | null;
          guest_lng?: number | null;
          delivery_promo?: string | null;
          loyalty_points_credited?: boolean;
          source?: string;
          has_upsell?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          store_id?: string;
          type?: OrderTypeEnum;
          status?: OrderStatusEnum;
          payment_status?: PaymentStatusEnum;
          total_price?: number | string;
          address_id?: string | null;
          delivery_notes?: string | null;
          estimated_delivery_time?: string | null;
          driver_id?: string | null;
          guest_phone?: string | null;
          guest_delivery_label?: string | null;
          guest_delivery_address?: string | null;
          guest_delivery_city?: string | null;
          guest_lat?: number | null;
          guest_lng?: number | null;
          delivery_promo?: string | null;
          loyalty_points_credited?: boolean;
          source?: string;
          has_upsell?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_name?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      order_status_events: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatusEnum;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatusEnum;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: OrderStatusEnum;
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
      customization_preset_groups: {
        Row: {
          id: string;
          preset_id: string;
          name: string;
          required: boolean;
          max_select: number;
          position: number;
        };
        Insert: {
          id?: string;
          preset_id: string;
          name: string;
          required?: boolean;
          max_select?: number;
          position?: number;
        };
        Update: {
          id?: string;
          preset_id?: string;
          name?: string;
          required?: boolean;
          max_select?: number;
          position?: number;
        };
        Relationships: [];
      };
      customization_preset_options: {
        Row: {
          id: string;
          preset_group_id: string;
          name: string;
          is_chargeable: boolean;
          price_modifier: string;
          position: number;
        };
        Insert: {
          id?: string;
          preset_group_id: string;
          name: string;
          is_chargeable?: boolean;
          price_modifier?: number | string;
          position?: number;
        };
        Update: {
          id?: string;
          preset_group_id?: string;
          name?: string;
          is_chargeable?: boolean;
          price_modifier?: number | string;
          position?: number;
        };
        Relationships: [];
      };
      customization_presets: {
        Row: {
          id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          created_at?: string;
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
          is_chargeable: boolean;
          price_modifier: string;
          position: number;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          is_chargeable?: boolean;
          price_modifier?: number | string;
          position?: number;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          is_chargeable?: boolean;
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
      delete_my_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      replace_store_opening_hours_for_my_store: {
        Args: { p_slots: Json };
        Returns: undefined;
      };
      replace_store_opening_hours_for_store: {
        Args: { p_store_id: string; p_slots: Json };
        Returns: undefined;
      };
      staff_customers_for_admin_orders: {
        Args: { p_order_ids: string[] };
        Returns: {
          order_id: string;
          phone: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      admin_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_restaurant_business: {
        Args: Record<string, never>;
        Returns: Json;
      };
      order_delivery_address: {
        Args: { p_order_id: string };
        Returns: {
          label: string;
          address: string;
          city: string;
          instructions: string | null;
        }[];
      };
      staff_customers_for_store_orders: {
        Args: { p_store_id: string };
        Returns: {
          order_id: string;
          phone: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      staff_customer_for_order: {
        Args: { p_order_id: string };
        Returns: {
          phone: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
    };
    Enums: {
      announcement_type: AnnouncementTypeEnum;
      order_type: OrderTypeEnum;
      order_status: OrderStatusEnum;
      payment_status: PaymentStatusEnum;
      staff_role: StaffRoleEnum;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
