export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  business_name: string;
  phone?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  category_name?: string;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  unit: string;
  image_url?: string;
  min_stock_level: number;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface StockBatch {
  id: string;
  product_id: string;
  product_name?: string;
  batch_number: string;
  quantity: number;
  expiry_date?: string;
  purchase_price: number;
  supplier_id?: string;
  supplier_name?: string;
  received_date: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  batch_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  user_id: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  loyalty_points: number;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  items: SaleItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid: number;
  change_due: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit' | 'bank_transfer';
  payment_reference?: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  notes?: string;
  user_id: string;
  created_at: string;
  synced_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_price: number;
  batch_id?: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  expected_date?: string;
  received_date?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  total_price: number;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'create' | 'update' | 'delete';
  record_id: string;
  data: any;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  created_at: string;
}

export interface DashboardSummary {
  today_sales: number;
  yesterday_sales: number;
  week_sales: number;
  month_sales: number;
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  active_customers: number;
  total_credit: number;
  pending_orders: number;
}

export interface SalesTrend {
  date: string;
  total: number;
  count: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
}

export interface Language {
  code: string;
  name: string;
  native_name: string;
}
