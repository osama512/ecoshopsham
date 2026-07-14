export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          merchant_id: string | null;
          name: string;
          price: number;
          description: string | null;
          image_url: string | null;
          images: string[] | null;
          stock_quantity: number;
          is_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          name: string;
          price: number;
          description?: string | null;
          image_url?: string | null;
          images?: string[] | null;
          stock_quantity?: number;
          is_visible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          name?: string;
          price?: number;
          description?: string | null;
          image_url?: string | null;
          images?: string[] | null;
          stock_quantity?: number;
          is_visible?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          merchant_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          order_details: unknown;
          total_price: number;
          status: string;
          payment_status: string | null;
          shamcash_invoice: string | null;
          shamcash_tran_id: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          order_details: unknown;
          total_price: number;
          status?: string;
          payment_status?: string | null;
          shamcash_invoice?: string | null;
          shamcash_tran_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          order_details?: unknown;
          total_price?: number;
          status?: string;
          payment_status?: string | null;
          shamcash_invoice?: string | null;
          shamcash_tran_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      merchant_shamcash: {
        Row: {
          merchant_id: string;
          wallet_address: string;
          api_key: string;
          enabled: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          merchant_id: string;
          wallet_address: string;
          api_key: string;
          enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          merchant_id?: string;
          wallet_address?: string;
          api_key?: string;
          enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
