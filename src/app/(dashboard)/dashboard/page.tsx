"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useProductStore } from "@/store/product-store"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/lib/db/offline"
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import type { DashboardSummary } from "@/types"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { products, fetchProducts } = useProductStore()
  const [summary, setSummary] = useState<DashboardSummary>({
    today_sales: 0,
    yesterday_sales: 0,
    week_sales: 0,
    month_sales: 0,
    total_products: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    active_customers: 0,
    total_credit: 0,
    pending_orders: 0,
  })

  useEffect(() => {
    if (!user) return
    fetchProducts(user.id)
  }, [user])

  const loadSummary = async () => {
    if (!user) return

    // Products
    const total_products = products.filter((p) => p.is_active).length

    // Stock batches to determine stock levels
    const batches = await db.stockBatches.where("user_id").equals(user.id).toArray()
    const stockByProduct: Record<string, number> = {}
    for (const b of batches) {
      stockByProduct[b.product_id] = (stockByProduct[b.product_id] || 0) + b.quantity
    }

    // Sales from IndexedDB
    const sales = await db.sales.where("user_id").equals(user.id).toArray()
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0]
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const today_sales = sales
      .filter((s) => s.created_at?.startsWith(today))
      .reduce((sum, s) => sum + s.grand_total, 0)
    const yesterday_sales = sales
      .filter((s) => s.created_at?.startsWith(yesterday))
      .reduce((sum, s) => sum + s.grand_total, 0)
    const week_sales = sales
      .filter((s) => s.created_at && s.created_at >= weekAgo)
      .reduce((sum, s) => sum + s.grand_total, 0)
    const month_sales = sales
      .filter((s) => s.created_at && s.created_at >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
      .reduce((sum, s) => sum + s.grand_total, 0)

    // Customers
    const customers = await db.customers.where("user_id").equals(user.id).toArray()
    const active_customers = customers.length
    const total_credit = customers.reduce((sum, c) => sum + c.current_balance, 0)

    const low_stock_count = products.filter(
      (p) => p.is_active && p.min_stock_level > 0 && (stockByProduct[p.id] || 0) <= p.min_stock_level && (stockByProduct[p.id] || 0) > 0
    ).length
    const outOfStock = products.filter(
      (p) => p.is_active && (stockByProduct[p.id] || 0) === 0
    ).length

    setSummary({ today_sales, yesterday_sales, week_sales, month_sales, total_products, low_stock_count, out_of_stock_count: outOfStock, active_customers, total_credit, pending_orders: 0 })
  }

  useEffect(() => {
    if (!user) return
    loadSummary()
  }, [user, products])

  const todayChange = summary.yesterday_sales > 0
    ? ((summary.today_sales - summary.yesterday_sales) / summary.yesterday_sales * 100).toFixed(1)
    : "0"

  const isUp = Number(todayChange) >= 0

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name || "User"}`}
        description={user?.business_name}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-primary/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Sales</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.today_sales)}</div>
            <div className="flex items-center gap-1 mt-1">
              {isUp ? (
                <ArrowUpRight className="h-3 w-3 text-success" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span className={cn("text-xs", isUp ? "text-success" : "text-destructive")}>
                {todayChange}% vs yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-success/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Week&apos;s Sales</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.week_sales)}</div>
            <p className="text-xs text-muted-foreground mt-1">This week total</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-info/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
              <Package className="h-4 w-4 text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_products}</div>
            <div className="flex items-center gap-2 mt-1">
              {summary.low_stock_count > 0 && (
                <Badge variant="warning">{summary.low_stock_count} low stock</Badge>
              )}
              {summary.out_of_stock_count > 0 && (
                <Badge variant="destructive">{summary.out_of_stock_count} out of stock</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-warning/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Users className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active_customers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Credit: {formatCurrency(summary.total_credit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <a
              href="/sales"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent/50 hover:border-accent transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">New Sale</span>
            </a>
            <a
              href="/products"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent/50 hover:border-accent transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <span className="text-sm font-medium">Add Product</span>
            </a>
            <a
              href="/stock"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent/50 hover:border-accent transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <span className="text-sm font-medium">Stock Alert</span>
            </a>
            <a
              href="/reports"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent/50 hover:border-accent transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <span className="text-sm font-medium">Reports</span>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Month Sales Target</span>
              <span className="text-sm font-medium">{formatCurrency(summary.month_sales)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
              <span className="text-sm font-medium">{summary.pending_orders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Products</span>
              <span className="text-sm font-medium">{summary.total_products}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
