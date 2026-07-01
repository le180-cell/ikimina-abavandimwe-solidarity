"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useProductStore } from "@/store/product-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchBar } from "@/components/ui/search-bar"
import { formatCurrency, generateId } from "@/lib/utils"
import { Plus, Pencil, Trash2, Package } from "lucide-react"
import type { Product } from "@/types"

export default function ProductsPage() {
  const { user } = useAuthStore()
  const { products, fetchProducts, fetchCategories, addProduct, updateProduct, deleteProduct } = useProductStore()
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: "", sku: "", barcode: "", category_id: "", description: "",
    unit_price: 0, cost_price: 0, tax_rate: 0, unit: "pcs", min_stock_level: 5, is_active: true,
  })

  useEffect(() => {
    if (user) {
      fetchProducts(user.id)
      fetchCategories(user.id)
    }
  }, [user, fetchProducts, fetchCategories])

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditingProduct(null)
    setForm({ name: "", sku: generateId().slice(0, 8).toUpperCase(), barcode: "", category_id: "", description: "", unit_price: 0, cost_price: 0, tax_rate: 0, unit: "pcs", min_stock_level: 5, is_active: true })
    setShowDialog(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name, sku: product.sku, barcode: product.barcode || "", category_id: product.category_id || "",
      description: product.description || "", unit_price: product.unit_price, cost_price: product.cost_price,
      tax_rate: product.tax_rate, unit: product.unit, min_stock_level: product.min_stock_level, is_active: product.is_active,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (editingProduct) {
      await updateProduct(editingProduct.id, form)
    } else {
      await addProduct({ ...form, user_id: user.id })
    }
    setShowDialog(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this product?")) {
      await deleteProduct(id)
    }
  }

  return (
    <div>
      <PageHeader title="Products" description="Manage your product catalog">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
      </PageHeader>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search products by name or SKU..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "name", label: "Name", render: (p: Product) => (
            <div>
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground ml-2">SKU: {p.sku}</span>
            </div>
          )},
          { key: "category_name", label: "Category", render: (p: Product) => (
            <Badge variant="secondary">{p.category_name || "-"}</Badge>
          )},
          { key: "unit_price", label: "Price", render: (p: Product) => formatCurrency(p.unit_price) },
          { key: "cost_price", label: "Cost", render: (p: Product) => formatCurrency(p.cost_price) },
          { key: "unit", label: "Unit" },
          { key: "min_stock_level", label: "Min Stock", render: (p: Product) => (
            <span className="text-xs text-muted-foreground">{p.min_stock_level}</span>
          )},
          { key: "is_active", label: "Status", render: (p: Product) => (
            <Badge variant={p.is_active ? "success" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
          )},
          { key: "actions", label: "", render: (p: Product) => (
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(p) }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )},
        ]}
        emptyMessage="No products yet. Add your first product!"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div>
              <Label>Unit Price (RWF)</Label>
              <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Cost Price (RWF)</Label>
              <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingProduct ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
