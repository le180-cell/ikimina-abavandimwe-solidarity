"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { usePurchaseOrderStore } from "@/store/purchase-order-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, formatDate, generateBatchNumber } from "@/lib/utils"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { isOnline } from "@/lib/utils"
import { ArrowLeft, Package, CheckCircle, XCircle, Truck } from "lucide-react"
import type { PurchaseOrder, StockBatch } from "@/types"

const statusVariant: Record<string, "secondary" | "default" | "success" | "destructive"> = {
  draft: "secondary",
  ordered: "default",
  received: "success",
  cancelled: "destructive",
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { orders, updateOrder } = usePurchaseOrderStore()
  const { user } = useAuthStore()

  const order = useMemo(() => {
    if (!id) return null
    const found = orders.find((o) => o.id === id)
    if (!found) return null
    if (found.items && !found.items[0]?.received_quantity) {
      return {
        ...found,
        items: found.items.map((i) => ({ ...i, received_quantity: i.received_quantity || 0 })),
      }
    }
    return found
  }, [id, orders])

  const loading = orders.length === 0

  const canSupabase = () => !useAuthStore.getState().isDemoMode && isOnline()

  const handleStatusChange = async (status: "ordered" | "cancelled") => {
    if (!order) return
    await updateOrder(order.id, { status } as any)
  }

  const handleReceive = async () => {
    if (!order || !user) return

    const itemList = order.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      order_id: order.id,
    }))

    // Create stock batches for each item
    for (const item of itemList) {
      const batch: StockBatch = {
        id: crypto.randomUUID(),
        product_id: item.product_id,
        product_name: item.product_name,
        batch_number: generateBatchNumber(item.product_id),
        quantity: item.quantity,
        purchase_price: item.unit_price,
        received_date: new Date().toISOString().split("T")[0],
        notes: `From PO ${order.order_number}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (canSupabase()) {
        const { error } = await supabase.from("stockBatches").insert(batch)
        if (!error) {
          await db.stockBatches.put(batch)
        } else {
          await db.stockBatches.add(batch)
          await addToSyncQueue("stockBatches", "create", batch.id, batch)
        }
      } else {
        await db.stockBatches.add(batch)
        await addToSyncQueue("stockBatches", "create", batch.id, batch)
      }
    }

    await updateOrder(order.id, {
      status: "received",
      received_date: new Date().toISOString(),
    } as any)
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Not Found" description="Purchase order not found" />
        <Button variant="outline" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Orders
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`From ${order.supplier_name || "Unknown Supplier"}`}
      >
        <Button variant="outline" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={item.id || i} className="border-b last:border-0">
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span>{order.supplier_name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              {order.expected_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected</span>
                  <span>{formatDate(order.expected_date)}</span>
                </div>
              )}
              {order.received_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received</span>
                  <span>{formatDate(order.received_date)}</span>
                </div>
              )}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.grand_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              {order.status === "draft" && (
                <>
                  <Button className="w-full" onClick={() => handleStatusChange("ordered")}>
                    <Truck className="h-4 w-4 mr-2" />Place Order
                  </Button>
                  <Button variant="outline" className="w-full text-destructive" onClick={() => handleStatusChange("cancelled")}>
                    <XCircle className="h-4 w-4 mr-2" />Cancel Order
                  </Button>
                </>
              )}
              {order.status === "ordered" && (
                <>
                  <Button className="w-full" onClick={handleReceive}>
                    <Package className="h-4 w-4 mr-2" />Receive All Items
                  </Button>
                  <Button variant="outline" className="w-full text-destructive" onClick={() => handleStatusChange("cancelled")}>
                    <XCircle className="h-4 w-4 mr-2" />Cancel Order
                  </Button>
                </>
              )}
              {order.status === "received" && (
                <div className="flex items-center gap-2 justify-center text-emerald-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Order received and stock updated
                </div>
              )}
              {order.status === "cancelled" && (
                <div className="flex items-center gap-2 justify-center text-destructive text-sm">
                  <XCircle className="h-4 w-4" />
                  Order cancelled
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
