"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { usePurchaseOrderStore } from "@/store/purchase-order-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/lib/db/offline"
import { Plus, Trash2, Save, Send } from "lucide-react"
import type { Supplier, Product } from "@/types"

interface LineItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export default function NewPurchaseOrderPage() {
  const { user } = useAuthStore()
  const { createOrder } = usePurchaseOrderStore()
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { product_id: "", product_name: "", quantity: 1, unit_price: 0 },
  ])
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!user) return
    const s = await db.suppliers.where("user_id").equals(user.id).toArray()
    const p = await db.products.where("user_id").equals(user.id).toArray()
    setSuppliers(s)
    setProducts(p)
  }

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const selectedSupplier = suppliers.find((s) => s.id === supplierId)

  const addItem = () => {
    setItems([...items, { product_id: "", product_name: "", quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item
      const newItem = { ...item, [field]: value }
      if (field === "product_id") {
        const product = products.find((p) => p.id === value)
        if (product) {
          newItem.product_name = product.name
          if (newItem.unit_price === 0) newItem.unit_price = product.cost_price
        }
      }
      return newItem
    })
    setItems(updated)
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handleSave = async (status: "draft" | "ordered") => {
    if (!user) return
    if (!supplierId) { alert("Please select a supplier"); return }
    if (items.some((i) => !i.product_id)) { alert("Please select a product for each line item"); return }

    setSaving(true)
    try {
      await createOrder({
        supplier_id: supplierId,
        supplier_name: selectedSupplier?.name,
        expected_date: expectedDate || undefined,
        notes,
        items,
        status,
      })
      router.push("/purchase-orders")
    } catch (err: any) {
      alert(err.message || "Failed to create order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New Purchase Order"
        description="Create an order to send to a supplier"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <Label>Supplier</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Order Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Product</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        value={item.product_id}
                        onChange={(e) => updateItem(index, "product_id", e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} - {p.sku}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min={0} value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))} />
                    </div>
                    <div className="w-24 text-right pb-1">
                      <div className="text-sm font-medium pt-5">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="mb-0" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>FRw 0</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Button className="w-full" onClick={() => handleSave("ordered")} disabled={saving}>
                  <Send className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Place Order"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSave("draft")} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
