import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  business_name: z.string().min(2, "Business name required"),
  phone: z.string().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  unit_price: z.coerce.number().min(0, "Price must be positive"),
  cost_price: z.coerce.number().min(0, "Cost must be positive"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  unit: z.string().min(1, "Unit is required"),
  min_stock_level: z.coerce.number().min(0).default(5),
  is_active: z.boolean().default(true),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contact_person: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
})

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  credit_limit: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

export const stockBatchSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  batch_number: z.string().min(1, "Batch number is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  expiry_date: z.string().optional(),
  purchase_price: z.coerce.number().min(0, "Price must be positive"),
  supplier_id: z.string().optional(),
  received_date: z.string().min(1, "Received date is required"),
  notes: z.string().optional(),
})

export const saleItemSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
})

export const saleSchema = z.object({
  customer_id: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  payment_method: z.enum(["cash", "mobile_money", "card", "credit", "bank_transfer"]),
  payment_reference: z.string().optional(),
  amount_paid: z.coerce.number().min(0),
  notes: z.string().optional(),
})

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item is required"),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ProductForm = z.infer<typeof productSchema>
export type CategoryForm = z.infer<typeof categorySchema>
export type SupplierForm = z.infer<typeof supplierSchema>
export type CustomerForm = z.infer<typeof customerSchema>
export type StockBatchForm = z.infer<typeof stockBatchSchema>
export type SaleForm = z.infer<typeof saleSchema>
export type PurchaseOrderForm = z.infer<typeof purchaseOrderSchema>
