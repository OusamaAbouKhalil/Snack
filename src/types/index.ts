export interface Category {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string; // Optional - lazy loaded for better egress performance
  price: number;
  category_id: string;
  image_url?: string; // Optional - lazy loaded for better egress performance
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}