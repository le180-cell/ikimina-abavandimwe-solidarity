import { create } from "zustand"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { generateId, isOnline } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import type { Product, Category } from "@/types"

interface ProductState {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  hasSupabase: () => boolean
  fetchProducts: (userId: string) => Promise<void>
  fetchCategories: (userId: string) => Promise<void>
  addProduct: (product: Omit<Product, "id" | "created_at" | "updated_at">) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addCategory: (category: Omit<Category, "id" | "created_at" | "updated_at">) => Promise<Category>
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  getLowStockProducts: () => Product[]
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,

  hasSupabase: () => !useAuthStore.getState().isDemoMode && isOnline(),

  fetchProducts: async (userId) => {
    set({ isLoading: true })
    try {
      if (get().hasSupabase()) {
        const { data: remote, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", userId)
        if (!error && remote && remote.length > 0) {
          await db.products.bulkPut(remote)
          set({ products: remote as Product[] })
          return
        }
      }
      const local = await db.products.where("user_id").equals(userId).toArray()
      set({ products: local })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCategories: async (userId) => {
    if (get().hasSupabase()) {
      const { data: remote, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
      if (!error && remote && remote.length > 0) {
        await db.categories.bulkPut(remote)
        set({ categories: remote as Category[] })
        return
      }
    }
    const local = await db.categories.where("user_id").equals(userId).toArray()
    set({ categories: local })
  },

  addProduct: async (productData) => {
    const product: Product = {
      ...productData,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Try saving directly to Supabase when online
    if (get().hasSupabase()) {
      const { error } = await supabase.from("products").insert(product)
      if (!error) {
        await db.products.put(product)
        set((s) => ({ products: [...s.products, product] }))
        return product
      }
    }

    // Fallback: save locally and queue for sync
    await db.products.add(product)
    await addToSyncQueue("products", "create", product.id, product)
    set((s) => ({ products: [...s.products, product] }))
    return product
  },

  updateProduct: async (id, data) => {
    const updated = { ...data, updated_at: new Date().toISOString() }

    if (get().hasSupabase()) {
      const { error } = await supabase.from("products").update(updated).eq("id", id)
      if (!error) {
        await db.products.update(id, updated)
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        }))
        return
      }
    }

    await db.products.update(id, updated)
    await addToSyncQueue("products", "update", id, updated)
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }))
  },

  deleteProduct: async (id) => {
    if (get().hasSupabase()) {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (!error) {
        await db.products.delete(id)
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
        return
      }
    }

    await db.products.delete(id)
    await addToSyncQueue("products", "delete", id, { id })
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
  },

  addCategory: async (catData) => {
    const category: Category = {
      ...catData,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (get().hasSupabase()) {
      const { error } = await supabase.from("categories").insert(category)
      if (!error) {
        await db.categories.put(category)
        set((s) => ({ categories: [...s.categories, category] }))
        return category
      }
    }

    await db.categories.add(category)
    await addToSyncQueue("categories", "create", category.id, category)
    set((s) => ({ categories: [...s.categories, category] }))
    return category
  },

  updateCategory: async (id, data) => {
    const updated = { ...data, updated_at: new Date().toISOString() }

    if (get().hasSupabase()) {
      const { error } = await supabase.from("categories").update(updated).eq("id", id)
      if (!error) {
        await db.categories.update(id, updated)
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return
      }
    }

    await db.categories.update(id, updated)
    await addToSyncQueue("categories", "update", id, updated)
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    }))
  },

  deleteCategory: async (id) => {
    if (get().hasSupabase()) {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (!error) {
        await db.categories.delete(id)
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
        return
      }
    }

    await db.categories.delete(id)
    await addToSyncQueue("categories", "delete", id, { id })
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },

  getLowStockProducts: () => {
    return get().products.filter(
      (p) => p.is_active && p.min_stock_level > 0
    )
  },
}))
