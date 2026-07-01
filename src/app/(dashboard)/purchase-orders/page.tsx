"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { usePurchaseOrderStore } from "@/store/purchase-order-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { SearchBar } from "@/components/ui/search-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, FileText, Trash2, Eye } from "lucide-react"
import type { PurchaseOrder } from "@/types"

const statusVariant: Record<string, "secondary" | "default" | "success" | "destructive"> = {
  draft: "secondary",
  ordered: "default",
  received: "success",
  cancelled: "destructive",
}

export default function PurchaseOrdersPage() {
  const { user } = useAuthStore()
  const { orders, fetchOrders, deleteOrder } = usePurchaseOrderStore()
  const router = useRouter()
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (user) fetchOrders(user.id)
  }, [user, fetchOrders])

  const filtered = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier_name || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalOrders = orders.length
  const pendingReceive = orders.filter((o) => o.status === "ordered").length
  const draftCount = orders.filter((o) => o.status === "draft").length
  const receivedCount = orders.filter((o) => o.status === "received").length

  const handleDelete = async (id: string) => {
    if (confirm("Delete this purchase order?")) {
      await deleteOrder(id)
    }
  }

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Manage orders to suppliers">
        <Button onClick={() => router.push("/purchase-orders/new")}>
          <Plus className="h-4 w-4 mr-2" />New Purchase Order
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{pendingReceive}</div>
            <p className="text-xs text-muted-foreground">awaiting receipt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <FileText className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{receivedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order # or supplier..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "order_number", label: "Order #", render: (o: PurchaseOrder) => (
            <span className="font-mono font-medium text-sm">{o.order_number}</span>
          )},
          { key: "supplier_name", label: "Supplier", render: (o: PurchaseOrder) => (
            <span>{o.supplier_name || "Unknown"}</span>
          )},
          { key: "items", label: "Items", render: (o: PurchaseOrder) => (
            <span>{o.items.length}</span>
          )},
          { key: "grand_total", label: "Total", render: (o: PurchaseOrder) => (
            <span className="font-medium">{formatCurrency(o.grand_total)}</span>
          )},
          { key: "status", label: "Status", render: (o: PurchaseOrder) => (
            <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
          )},
          { key: "expected_date", label: "Expected", render: (o: PurchaseOrder) => (
            <span className="text-sm text-muted-foreground">
              {o.expected_date ? formatDate(o.expected_date) : "-"}
            </span>
          )},
          { key: "created_at", label: "Created", render: (o: PurchaseOrder) => (
            <span className="text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
          )},
          { key: "actions", label: "", render: (o: PurchaseOrder) => (
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${o.id}`) }}>
                <Eye className="h-4 w-4" />
              </Button>
              {o.status === "draft" && (
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(o.id) }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )},
        ]}
        emptyMessage="No purchase orders yet"
      />
    </div>
  )
}
