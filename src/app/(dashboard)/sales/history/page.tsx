"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useSaleStore } from "@/store/sale-store"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchBar } from "@/components/ui/search-bar"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { Sale } from "@/types"

export default function SalesHistoryPage() {
  const { user } = useAuthStore()
  const { sales, fetchSales } = useSaleStore()
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (user) fetchSales(user.id)
  }, [user, fetchSales])

  const filtered = sales.filter(
    (s) =>
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || "").toLowerCase().includes(search.toLowerCase())
  )

  const todaySales = sales.filter(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString()
  )

  const statusBadge = (status: Sale["status"]) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      completed: "success",
      pending: "warning",
      cancelled: "destructive",
      refunded: "secondary",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  return (
    <div>
      <PageHeader title="Sales History" description="View all completed transactions">
        <div className="text-sm text-muted-foreground">
          Today: <span className="font-bold text-foreground">{formatCurrency(todaySales.reduce((sum, s) => sum + s.grand_total, 0))}</span>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filtered.reduce((sum, s) => sum + s.grand_total, 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credit Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filtered.filter(s => s.payment_method === "credit").reduce((sum, s) => sum + s.grand_total, 0))}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice or customer..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "invoice_number", label: "Invoice", render: (s: Sale) => (
            <span className="font-mono text-sm font-medium">{s.invoice_number}</span>
          )},
          { key: "customer_name", label: "Customer", render: (s: Sale) => s.customer_name || <span className="text-muted-foreground">Walk-in</span> },
          { key: "items_count", label: "Items", render: (s: Sale) => s.items.length },
          { key: "grand_total", label: "Total", render: (s: Sale) => formatCurrency(s.grand_total) },
          { key: "payment_method", label: "Method", render: (s: Sale) => (
            <span className="capitalize text-sm">{s.payment_method.replace("_", " ")}</span>
          )},
          { key: "status", label: "Status", render: (s: Sale) => statusBadge(s.status) },
          { key: "created_at", label: "Date", render: (s: Sale) => formatDateTime(s.created_at) },
        ]}
        emptyMessage="No sales recorded yet"
      />
    </div>
  )
}
