import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmxkiuzfasdwxsigyizy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteGtpdXpmYXNkd3hzaWd5aXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMDYzMDIsImV4cCI6MjA2NDc4MjMwMn0.IodAc1MndObssiRE-mWqukrLshMbT4UoHAkryYI7Fuk';

// Create Supabase client with custom fetch to handle QUIC protocol errors
// QUIC (HTTP/3) errors can occur when browser tries to use QUIC but connection fails
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const customOptions: RequestInit = {
        ...options,
        // Disable cache to force fresh requests
        cache: 'no-store',
        credentials: 'omit',
      };
      
      try {
        return await fetch(url, customOptions);
      } catch (error: any) {
        // If QUIC error, log it for debugging
        if (error.message?.includes('QUIC') || error.name === 'TypeError') {
          console.warn('Network fetch error (may be QUIC related):', error.message);
          // Rethrow to let the retry logic in useProducts handle it
        }
        throw error;
      }
    },
  },
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_order?: number;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          category_id: string;
          image_url: string;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          category_id: string;
          image_url?: string;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          category_id?: string;
          image_url?: string;
          is_available?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          total_amount: number;
          payment_method: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_name?: string;
          total_amount: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_name?: string;
          total_amount?: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
    };
  };
};