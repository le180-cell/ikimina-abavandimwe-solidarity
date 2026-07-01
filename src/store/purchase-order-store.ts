import { create } from "zustand"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { generateId, generateOrderNumber, isOnline } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import type { PurchaseOrder, PurchaseOrderItem, Product } from "@/types"

interface POState {
  orders: PurchaseOrder[]
  isLoading: boolean
  hasSupabase: () => boolean
  fetchOrders: (userId: string) => Promise<void>
  createOrder: (data: {
    supplier_id: string
    supplier_name?: string
    expected_date?: string
    notes?: string
    items: { product_id: string; product_name: string; quantity: number; unit_price: number }[]
    status?: "draft" | "ordered"
  }) => Promise<PurchaseOrder>
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
}

export const usePurchaseOrderStore = create<POState>((set, get) => ({
  orders: [],
  isLoading: false,

  hasSupabase: () => !useAuthStore.getState().isDemoMode && isOnline(),

  fetchOrders: async (userId) => {
    set({ isLoading: true })
    try {
      if (get().hasSupabase()) {
        const { data: remote, error } = await supabase
          .from("purchaseOrders")
          .select("*")
          .eq("user_id", userId)
        if (!error && remote && remote.length > 0) {
          await db.purchaseOrders.bulkPut(remote)
          set({ orders: remote as PurchaseOrder[] })
          return
        }
      }
      const local = await db.purchaseOrders.where("user_id").equals(userId).toArray()
      set({ orders: local })
    } finally {
      set({ isLoading: false })
    }
  },

  createOrder: async (data) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error("Not authenticated")

    const items: PurchaseOrderItem[] = data.items.map((item) => ({
      id: generateId(),
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      received_quantity: 0,
      total_price: item.quantity * item.unit_price,
    }))

    const subtotal = items.reduce((s, i) => s + i.total_price, 0)
    const tax_total = 0
    const grand_total = subtotal + tax_total

    const order: PurchaseOrder = {
      id: generateId(),
      order_number: generateOrderNumber(),
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      items,
      subtotal,
      tax_total,
      grand_total,
      status: data.status || "draft",
      expected_date: data.expected_date,
      notes: data.notes,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (get().hasSupabase()) {
      const { error } = await supabase.from("purchaseOrders").insert(order)
      if (!error) {
        await db.purchaseOrders.put(order)
        set((s) => ({ orders: [...s.orders, order] }))
        return order
      }
    }

    await db.purchaseOrders.add(order)
    await addToSyncQueue("purchaseOrders", "create", order.id, order)
    set((s) => ({ orders: [...s.orders, order] }))
    return order
  },

  updateOrder: async (id, data) => {
    const updated = { ...data, updated_at: new Date().toISOString() }

    if (get().hasSupabase()) {
      const { error } = await supabase.from("purchaseOrders").update(updated).eq("id", id)
      if (!error) {
        await db.purchaseOrders.update(id, updated)
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...updated } : o)),
        }))
        return
      }
    }

    await db.purchaseOrders.update(id, updated)
    await addToSyncQueue("purchaseOrders", "update", id, updated)
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...updated } : o)),
    }))
  },

  deleteOrder: async (id) => {
    if (get().hasSupabase()) {
      const { error } = await supabase.from("purchaseOrders").delete().eq("id", id)
      if (!error) {
        await db.purchaseOrders.delete(id)
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
        return
      }
    }

    await db.purchaseOrders.delete(id)
    await addToSyncQueue("purchaseOrders", "delete", id, { id })
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
  },
}))
