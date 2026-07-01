const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000"

interface SalesDataPoint {
  date: string
  total: number
  count: number
}

export async function getDemandForecast(salesHistory: SalesDataPoint[], daysAhead = 30) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_history: salesHistory, days_ahead: daysAhead }),
    })
    if (!res.ok) throw new Error(`AI service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    return { forecast: [], trend: "unavailable", confidence: 0, recommendation: "AI service not reachable" }
  }
}

export async function getStockAlert(
  productId: string,
  productName: string,
  currentStock: number,
  avgDailySales: number,
  leadTimeDays = 7
) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/stock-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        product_name: productName,
        current_stock: currentStock,
        avg_daily_sales: avgDailySales,
        lead_time_days: leadTimeDays,
      }),
    })
    if (!res.ok) throw new Error(`AI service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    return null
  }
}

export async function getSalesAnomalies(salesData: SalesDataPoint[]) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_data: salesData }),
    })
    if (!res.ok) throw new Error(`AI service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    return { anomalies: [], summary: "AI service not reachable" }
  }
}

export async function getBusinessInsights(data: {
  total_revenue: number
  total_cost: number
  transaction_count: number
  active_products: number
  customer_count: number
  credit_sales: number
  low_stock_count: number
}) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`AI service error: ${res.status}`)
    return await res.json()
  } catch (err) {
    return {
      health_score: 0,
      profit_margin: 0,
      avg_order_value: 0,
      recommendations: ["AI service not reachable - install and start the AI service"],
    }
  }
}
