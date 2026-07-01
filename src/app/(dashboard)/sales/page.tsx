"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useSaleStore } from "@/store/sale-store"
import { useProductStore } from "@/store/product-store"
import { db } from "@/lib/db/offline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchBar } from "@/components/ui/search-bar"
import { formatCurrency } from "@/lib/utils"
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Smartphone, Banknote, X } from "lucide-react"
import type { Product, StockBatch, Customer } from "@/types"

export default function POSPage() {
  const { user } = useAuthStore()
  const { currentSale, addItem, removeItem, updateItemQuantity, clearSale, setCustomer, completeSale } = useSaleStore()
  const { products, fetchProducts, fetchCategories, categories } = useProductStore()
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [selectedCat, setSelectedCat] = useState("all")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card" | "credit" | "bank_transfer">("cash")
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentRef, setPaymentRef] = useState("")

  const loadBatches = async () => {
    if (!user) return
    const b = await db.stockBatches.where("user_id").equals(user.id).toArray()
    setBatches(b.filter((batch) => !batch.expiry_date || new Date(batch.expiry_date) >= new Date()))
  }

  const loadCustomers = () => {
    if (!user) return
    db.customers.where("user_id").equals(user.id).toArray().then(setCustomers)
  }

  useEffect(() => {
    if (user) {
      fetchProducts(user.id)
      fetchCategories(user.id)
      loadBatches()
      loadCustomers()
    }
  }, [user])

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode || "").includes(productSearch)
    const matchCat = selectedCat === "all" || p.category_id === selectedCat
    return p.is_active && matchSearch && matchCat
  })

  const getAvailableStock = (productId: string) => {
    return batches
      .filter((b) => b.product_id === productId)
      .reduce((sum, b) => sum + b.quantity, 0)
  }

  const handleAddProduct = (product: Product) => {
    const idx = currentSale.items.findIndex((i) => i.product_id === product.id)
    if (idx >= 0) {
      updateItemQuantity(idx, currentSale.items[idx].quantity + 1)
    } else {
      addItem({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        tax_rate: product.tax_rate,
        tax_amount: 0,
        discount_amount: 0,
        total_price: product.unit_price,
      })
    }
  }

  const subtotal = currentSale.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const taxTotal = currentSale.items.reduce((sum, i) => sum + i.tax_amount, 0)
  const grandTotal = subtotal + taxTotal
  const changeDue = Math.max(0, amountPaid - grandTotal)

  const handlePayment = async () => {
    if (!user || currentSale.items.length === 0) return
    await completeSale({
      user_id: user.id,
      payment_method: paymentMethod,
      amount_paid: paymentMethod === "credit" ? 0 : amountPaid,
      payment_reference: paymentRef || undefined,
      notes: undefined,
    })
    setShowPayment(false)
    setAmountPaid(0)
    setPaymentRef("")
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4 flex gap-2">
          <SearchBar value={productSearch} onChange={setProductSearch} placeholder="Search by name, SKU, or barcode..." className="flex-1" />
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-40"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 content-start">
          {filteredProducts.map((product) => {
            const stock = getAvailableStock(product.id)
            const lowStock = stock > 0 && stock <= product.min_stock_level
            return (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                disabled={stock <= 0}
                className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-sm line-clamp-2">{product.name}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(product.unit_price)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={stock <= 0 ? "destructive" : lowStock ? "warning" : "secondary"}>
                    {stock} in stock
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-96 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Current Sale
              </CardTitle>
              {currentSale.items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSale}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                value={currentSale.customer_id || ""}
                onChange={(e) => {
                  const c = customers.find((c) => c.id === e.target.value)
                  setCustomer(e.target.value, c?.name || "")
                }}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3">
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {currentSale.items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(idx, Math.max(0, item.quantity - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(idx, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-bold">{formatCurrency(item.unit_price * item.quantity)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {currentSale.items.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">Click products to add</p>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <Button
                className="w-full h-12 text-base"
                disabled={currentSale.items.length === 0}
                onClick={() => setShowPayment(true)}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Pay {formatCurrency(grandTotal)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "mobile_money", "card", "credit"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      paymentMethod === method ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                    }`}
                  >
                    {method === "cash" && <Banknote className="h-4 w-4" />}
                    {method === "mobile_money" && <Smartphone className="h-4 w-4" />}
                    {method === "card" && <CreditCard className="h-4 w-4" />}
                    {method === "credit" && <ShoppingCart className="h-4 w-4" />}
                    <span className="capitalize">{method.replace("_", " ")}</span>
                  </button>
                ))}
              </div>

              {paymentMethod !== "credit" && (
                <div>
                  <Label>Amount Received</Label>
                  <Input
                    type="number"
                    value={amountPaid || ""}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    placeholder="Enter amount received"
                  />
                  {amountPaid >= grandTotal && (
                    <p className="text-sm text-emerald-600 mt-1">
                      Change: {formatCurrency(changeDue)}
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === "mobile_money" && (
                <div>
                  <Label>Transaction Reference</Label>
                  <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="MTN/MoMo ref" />
                </div>
              )}

              {currentSale.customer_name && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  Customer: <strong>{currentSale.customer_name}</strong>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold">
                <span>Total Due</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={paymentMethod !== "credit" && amountPaid < grandTotal}
                >
                  Complete Sale
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
