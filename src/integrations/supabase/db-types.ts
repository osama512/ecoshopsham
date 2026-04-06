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
          created_at?: string;
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
