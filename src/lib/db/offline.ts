import Dexie, { type EntityTable } from "dexie"
import type {
  Product,
  Category,
  StockBatch,
  StockMovement,
  Supplier,
  Customer,
  Sale,
  SaleItem,
  PurchaseOrder,
  PurchaseOrderItem,
  SyncQueueItem,
} from "@/types"

class EliteFlowDB extends Dexie {
  products!: EntityTable<Product, "id">
  categories!: EntityTable<Category, "id">
  stockBatches!: EntityTable<StockBatch, "id">
  stockMovements!: EntityTable<StockMovement, "id">
  suppliers!: EntityTable<Supplier, "id">
  customers!: EntityTable<Customer, "id">
  sales!: EntityTable<Sale, "id">
  saleItems!: EntityTable<SaleItem, "id">
  purchaseOrders!: EntityTable<PurchaseOrder, "id">
  purchaseOrderItems!: EntityTable<PurchaseOrderItem, "id">
  syncQueue!: EntityTable<SyncQueueItem, "id">

  constructor() {
    super("EliteFlow")
    this.version(2).stores({
      products: "id, name, sku, category_id, is_active, user_id",
      categories: "id, name, user_id",
      stockBatches: "id, product_id, batch_number, expiry_date, supplier_id, user_id",
      stockMovements: "id, product_id, type, created_at, batch_id, user_id",
      suppliers: "id, name, phone, user_id",
      customers: "id, name, phone, user_id",
      sales: "id, invoice_number, customer_id, status, created_at, user_id",
      saleItems: "id, sale_id, product_id",
      purchaseOrders: "id, order_number, supplier_id, status, user_id",
      purchaseOrderItems: "id, order_id, product_id",
      syncQueue: "++id, table, operation, status, created_at",
    })
  }
}

export const db = new EliteFlowDB()
