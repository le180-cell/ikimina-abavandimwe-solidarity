"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { db } from "@/lib/db/offline"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart3, TrendingUp, Download, FileText,
  BrainCircuit,
  AlertCircle, Lightbulb, ShoppingCart
} from "lucide-react"
import { getBusinessInsights, getDemandForecast } from "@/lib/ai-service"
import type { Sale, Product, Customer } from "@/types"

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month")
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [aiForecast, setAiForecast] = useState<any>(null)

  const loadData = async () => {
    if (!user) return
    const s = await db.sales.where("user_id").equals(user.id).toArray()
    const p = await db.products.where("user_id").equals(user.id).toArray()
    const c = await db.customers.where("user_id").equals(user.id).toArray()
    setSales(s)
    setProducts(p)
    setCustomers(c)
  }

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const getPeriodFilter = () => {
    const now = new Date()
    switch (period) {
      case "today":
        return (d: string) => new Date(d).toDateString() === now.toDateString()
      case "week": {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return (d: string) => new Date(d) >= weekAgo
      }
      case "month": {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
        return (d: string) => new Date(d) >= monthAgo
      }
      default:
        return () => true
    }
  }

  const filteredSales = sales.filter((s) => s.status === "completed" && getPeriodFilter()(s.created_at))
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0)
  const totalCost = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, i) => itemSum + i.cost_price * i.quantity, 0)
  }, 0)
  const grossProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0"

  // Top selling products
  const productSales: Record<string, { name: string; qty: number; rev: number }> = {}
  filteredSales.forEach((s) => {
    s.items.forEach((i) => {
      if (!productSales[i.product_id]) productSales[i.product_id] = { name: i.product_name, qty: 0, rev: 0 }
      productSales[i.product_id].qty += i.quantity
      productSales[i.product_id].rev += i.total_price
    }
  )})
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b.rev - a.rev)
    .slice(0, 10)

  useEffect(() => {
    if (filteredSales.length > 0) {
      getBusinessInsights({
        total_revenue: totalRevenue,
        total_cost: totalCost,
        transaction_count: filteredSales.length,
        active_products: products.filter((p) => p.is_active).length,
        customer_count: customers.length,
        credit_sales: filteredSales.filter((s) => s.payment_method === "credit").reduce((s, sale) => s + sale.grand_total, 0),
        low_stock_count: products.filter((p) => p.is_active && p.min_stock_level > 0).length,
      }).then(setAiInsights)

      const dailyData = Object.entries(
        filteredSales.reduce(
          (acc, s) => {
            const day = s.created_at.split("T")[0]
            acc[day] = (acc[day] || 0) + s.grand_total
            return acc
          },
          {} as Record<string, number>
        )
      ).map(([date, total]) => ({ date, total, count: 1 }))

      if (dailyData.length >= 3) {
        getDemandForecast(dailyData, 14).then(setAiForecast)
      }
    }
  }, [filteredSales.length, period])

  const exportReport = () => {
    const rows = [
      ["Report: Sales Summary", "", "", ""],
      ["Period", period, "", ""],
      ["", "", "", ""],
      ["Metric", "Value", "", ""],
      ["Total Revenue", formatCurrency(totalRevenue), "", ""],
      ["Total Cost", formatCurrency(totalCost), "", ""],
      ["Gross Profit", formatCurrency(grossProfit), "", ""],
      ["Profit Margin", `${profitMargin}%`, "", ""],
      ["Total Transactions", String(filteredSales.length), "", ""],
      ["", "", "", ""],
      ["Top Products", "Qty Sold", "Revenue", ""],
      ...topProducts.map(([, p]) => [p.name, String(p.qty), formatCurrency(p.rev), ""]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `eliteflow-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Business performance insights">
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gross Profit</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(grossProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Profit Margin</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map(([id, p], i) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                    <div>
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">x{p.qty}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(p.rev)}</span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">No sales data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(["cash", "mobile_money", "card", "credit", "bank_transfer"] as const).map((method) => {
              const total = filteredSales.filter((s) => s.payment_method === method).reduce((sum, s) => sum + s.grand_total, 0)
              const pct = totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(1) : "0"
              if (total === 0) return null
              return (
                <div key={method} className="flex items-center justify-between py-2">
                  <span className="text-sm capitalize">{method.replace("_", " ")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">{formatCurrency(total)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
            {filteredSales.length === 0 && (
              <p className="text-sm text-muted-foreground">No payment data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Sales by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayMap: Record<string, number> = {}
              filteredSales.forEach((s) => {
                const day = new Date(s.created_at).toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" })
                dayMap[day] = (dayMap[day] || 0) + s.grand_total
              })
              const entries = Object.entries(dayMap).slice(-14)
              if (entries.length === 0) return <p className="text-sm text-muted-foreground">No data</p>
              const maxVal = Math.max(...entries.map(([, v]) => v))
              return (
                <div className="space-y-2">
                  {entries.map(([day, total]) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 text-right">{day}</span>
                      <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${(total / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Business Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Active Products</span><span className="font-medium">{products.filter(p => p.is_active).length}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Customers</span><span className="font-medium">{customers.length}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Avg Order Value</span><span className="font-medium">{filteredSales.length > 0 ? formatCurrency(totalRevenue / filteredSales.length) : formatCurrency(0)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Credit Sales</span><span className="font-medium">{formatCurrency(filteredSales.filter(s => s.payment_method === "credit").reduce((sum, s) => sum + s.grand_total, 0))}</span></div>
          </CardContent>
        </Card>
      </div>

      {aiInsights && (
        <div className="mt-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" /> AI Business Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 border">
                  <span className="text-sm text-muted-foreground">Health Score</span>
                  <span className={`text-lg font-bold ${aiInsights.health_score >= 70 ? "text-emerald-600" : aiInsights.health_score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                    {aiInsights.health_score}/100
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 border">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <span className={`text-lg font-bold ${aiInsights.profit_margin >= 15 ? "text-emerald-600" : "text-amber-600"}`}>
                    {aiInsights.profit_margin}%
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 border">
                  <span className="text-sm text-muted-foreground">Avg Order</span>
                  <span className="text-lg font-bold">{formatCurrency(aiInsights.avg_order_value)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" /> Recommendations
                </h4>
                <div className="space-y-2">
                  {aiInsights.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm border">
                      <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {aiForecast && aiForecast.trend !== "unavailable" && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Demand Forecast (14 days)
                  </h4>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant={aiForecast.trend === "upward" ? "success" : aiForecast.trend === "downward" ? "destructive" : "secondary"}>
                      {aiForecast.trend} trend
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(aiForecast.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{aiForecast.recommendation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
