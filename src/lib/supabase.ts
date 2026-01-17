import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that we have the required credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please create a .env file with:');
  console.error('VITE_SUPABASE_URL=https://esyrycoegjqlakjunojd.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your_key_here');
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Log configuration (without exposing the key)
console.log('🔧 Supabase configured:', {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  hasEnvVars: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
});

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
