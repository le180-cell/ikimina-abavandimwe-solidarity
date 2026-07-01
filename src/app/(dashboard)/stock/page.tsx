"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchBar } from "@/components/ui/search-bar"
import { db } from "@/lib/db/offline"
import { formatCurrency, formatDate, generateBatchNumber } from "@/lib/utils"
import { addToSyncQueue } from "@/lib/db/sync"
import { supabase } from "@/lib/supabase/client"
import { isOnline } from "@/lib/utils"
import { Plus, AlertTriangle, Package } from "lucide-react"
import type { StockBatch, Product } from "@/types"

export default function StockPage() {
  const { user } = useAuthStore()
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    product_id: "", batch_number: "", quantity: 1, purchase_price: 0,
    expiry_date: "", supplier_id: "", received_date: new Date().toISOString().split("T")[0], notes: "",
  })

  const canSupabase = () => !useAuthStore.getState().isDemoMode && isOnline()

  const loadData = async () => {
    if (!user) return
    const b = await db.stockBatches.where("user_id").equals(user.id).toArray()
    const p = await db.products.where("user_id").equals(user.id).toArray()
    setBatches(b)
    setProducts(p)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const filtered = batches.filter(
    (b) =>
      (b.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(search.toLowerCase())
  )

  const getProduct = (id: string) => products.find((p) => p.id === id)

  const openNew = () => {
    const firstProduct = products[0]
    setForm({
      product_id: firstProduct?.id || "",
      batch_number: generateBatchNumber(firstProduct?.id || "NEW"),
      quantity: 1, purchase_price: 0, expiry_date: "", supplier_id: "",
      received_date: new Date().toISOString().split("T")[0], notes: "",
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!user) return
    const product = getProduct(form.product_id)
    const batch: StockBatch = {
      id: crypto.randomUUID(),
      product_id: form.product_id,
      product_name: product?.name,
      batch_number: form.batch_number,
      quantity: form.quantity,
      purchase_price: form.purchase_price,
      expiry_date: form.expiry_date || undefined,
      supplier_id: form.supplier_id || undefined,
      received_date: form.received_date,
      notes: form.notes,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (canSupabase()) {
      const { error } = await supabase.from("stockBatches").insert(batch)
      if (!error) {
        await db.stockBatches.put(batch)
        setShowDialog(false)
        loadData()
        return
      }
    }
    await db.stockBatches.add(batch)
    await addToSyncQueue("stockBatches", "create", batch.id, batch)
    setShowDialog(false)
    loadData()
  }

  const isExpired = (date?: string) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const isExpiringSoon = (date?: string) => {
    if (!date) return false
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    return new Date(date) <= soon && !isExpired(date)
  }

  const totalStock = batches.reduce((sum, b) => {
    if (!isExpired(b.expiry_date)) return sum + b.quantity
    return sum
  }, 0)

  const expiredCount = batches.filter((b) => isExpired(b.expiry_date)).reduce((sum, b) => sum + b.quantity, 0)

  return (
    <div>
      <PageHeader title="Stock Management" description="Track inventory batches and expiry">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Stock Batch</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">units in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.filter((b) => isExpiringSoon(b.expiry_date)).length}</div>
            <p className="text-xs text-muted-foreground">batches expiring within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">units expired</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by product or batch..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "product_name", label: "Product", render: (b: StockBatch) => (
            <span className="font-medium">{b.product_name || "Unknown"}</span>
          )},
          { key: "batch_number", label: "Batch #" },
          { key: "quantity", label: "Qty", render: (b: StockBatch) => (
            <span className="font-medium">{b.quantity}</span>
          )},
          { key: "purchase_price", label: "Unit Cost", render: (b: StockBatch) => formatCurrency(b.purchase_price) },
          { key: "expiry_date", label: "Expiry", render: (b: StockBatch) => {
            if (!b.expiry_date) return <span className="text-muted-foreground">N/A</span>
            return (
              <Badge variant={isExpired(b.expiry_date) ? "destructive" : isExpiringSoon(b.expiry_date) ? "warning" : "secondary"}>
                {formatDate(b.expiry_date)}
              </Badge>
            )
          }},
          { key: "received_date", label: "Received", render: (b: StockBatch) => formatDate(b.received_date) },
        ]}
        emptyMessage="No stock batches recorded"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Batch</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={form.product_id}
                onChange={(e) => {
                  const p = getProduct(e.target.value)
                  setForm({ ...form, product_id: e.target.value, batch_number: generateBatchNumber(e.target.value), purchase_price: p?.cost_price || 0 })
                }}
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - {p.sku}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Batch Number</Label>
              <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Unit Cost (RWF)</Label>
              <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Received Date</Label>
              <Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
