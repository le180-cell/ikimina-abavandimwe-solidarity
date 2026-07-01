import { create } from "zustand"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { generateId, generateInvoiceNumber, isOnline } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import type { Sale, SaleItem } from "@/types"

interface SaleState {
  currentSale: {
    items: SaleItem[]
    customer_id?: string
    customer_name?: string
  }
  sales: Sale[]
  isLoading: boolean
  addItem: (item: Omit<SaleItem, "id" | "sale_id">) => void
  removeItem: (index: number) => void
  updateItemQuantity: (index: number, quantity: number) => void
  clearSale: () => void
  setCustomer: (id: string, name: string) => void
  completeSale: (data: {
    user_id: string
    payment_method: Sale["payment_method"]
    amount_paid: number
    payment_reference?: string
    discount_total?: number
    notes?: string
  }) => Promise<Sale>
  fetchSales: (userId: string) => Promise<void>
  getSaleById: (id: string) => Sale | undefined
}

export const useSaleStore = create<SaleState>((set, get) => ({
  currentSale: { items: [] },
  sales: [],
  isLoading: false,

  addItem: (item) => {
    set((s) => ({
      currentSale: {
        ...s.currentSale,
        items: [
          ...s.currentSale.items,
          { ...item, id: generateId() } as SaleItem,
        ],
      },
    }))
  },

  removeItem: (index) => {
    set((s) => ({
      currentSale: {
        ...s.currentSale,
        items: s.currentSale.items.filter((_, i) => i !== index),
      },
    }))
  },

  updateItemQuantity: (index, quantity) => {
    set((s) => {
      const items = [...s.currentSale.items]
      const item = { ...items[index], quantity }
      item.total_price = quantity * item.unit_price - item.discount_amount
      items[index] = item
      return { currentSale: { ...s.currentSale, items } }
    })
  },

  clearSale: () => {
    set({ currentSale: { items: [] } })
  },

  setCustomer: (id, name) => {
    set((s) => ({
      currentSale: { ...s.currentSale, customer_id: id, customer_name: name },
    }))
  },

  completeSale: async ({
    user_id,
    payment_method,
    amount_paid,
    payment_reference,
    discount_total = 0,
    notes,
  }) => {
    const { currentSale } = get()
    const subtotal = currentSale.items.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    )
    const taxTotal = currentSale.items.reduce((sum, i) => sum + i.tax_amount, 0)
    const grandTotal = subtotal + taxTotal - discount_total
    const changeDue = Math.max(0, amount_paid - grandTotal)

    const finalAmountPaid = payment_method === "credit" ? 0 : amount_paid

    const sale: Sale = {
      id: generateId(),
      invoice_number: generateInvoiceNumber(),
      customer_id: currentSale.customer_id,
      customer_name: currentSale.customer_name,
      items: currentSale.items,
      subtotal,
      tax_total: taxTotal,
      discount_total,
      grand_total: grandTotal,
      amount_paid: finalAmountPaid,
      change_due: changeDue,
      payment_method,
      payment_reference,
      status: "completed",
      notes,
      user_id,
      created_at: new Date().toISOString(),
    }

    // Save to IndexedDB first
    await db.sales.add(sale)
    await db.saleItems.bulkAdd(
      currentSale.items.map((i) => ({ ...i, sale_id: sale.id }))
    )

    // Update stock batches locally
    for (const item of currentSale.items) {
      if (item.batch_id) {
        const batch = await db.stockBatches.get(item.batch_id)
        if (batch) {
          await db.stockBatches.update(item.batch_id, {
            quantity: batch.quantity - item.quantity,
          })
        }
      }
    }

    // Save directly to Supabase when online
    if (!useAuthStore.getState().isDemoMode && isOnline()) {
      const { error } = await supabase.from("sales").insert(sale)
      if (!error) {
        const itemsWithSaleId = currentSale.items.map((i) => ({
          ...i,
          sale_id: sale.id,
        }))
        await supabase.from("sale_items").insert(itemsWithSaleId).maybeSingle()
      } else {
        await addToSyncQueue("sales", "create", sale.id, sale)
      }
    } else {
      await addToSyncQueue("sales", "create", sale.id, sale)
    }

    set((s) => ({ sales: [...s.sales, sale], currentSale: { items: [] } }))
    return sale
  },

  fetchSales: async (userId) => {
    set({ isLoading: true })
    try {
      if (!useAuthStore.getState().isDemoMode && isOnline()) {
        const { data: remote, error } = await supabase
          .from("sales")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
        if (!error && remote && remote.length > 0) {
          await db.sales.bulkPut(remote)
          set({ sales: remote as Sale[] })
          return
        }
      }
      const local = await db.sales.where("user_id").equals(userId).toArray()
      set({ sales: local.reverse() as Sale[] })
    } finally {
      set({ isLoading: false })
    }
  },

  getSaleById: (id) => {
    return get().sales.find((s) => s.id === id)
  },
}))
