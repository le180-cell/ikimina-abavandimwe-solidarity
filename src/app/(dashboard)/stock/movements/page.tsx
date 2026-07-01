"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { DataTable } from "@/components/ui/data-table"
import { SearchBar } from "@/components/ui/search-bar"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { db } from "@/lib/db/offline"
import type { StockMovement } from "@/types"

export default function StockMovementsPage() {
  const { user } = useAuthStore()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [search, setSearch] = useState("")

  const loadMovements = async () => {
    if (!user) return
    const data = await db.stockMovements
      .where("user_id")
      .equals(user.id)
      .sortBy("created_at")
    setMovements(data.reverse().slice(0, 200))
  }

  useEffect(() => {
    if (user) loadMovements()
  }, [user])

  const filtered = movements.filter(
    (m) =>
      (m.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  )

  const typeBadge = (type: StockMovement["type"]) => {
    const variants: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
      in: "success",
      out: "destructive",
      adjustment: "warning",
      transfer: "secondary",
    }
    return <Badge variant={variants[type]}>{type}</Badge>
  }

  return (
    <div>
      <PageHeader title="Stock Movements" description="Track all inventory changes" />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search movements..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "created_at", label: "Date", render: (m: StockMovement) => formatDateTime(m.created_at) },
          { key: "product_name", label: "Product", render: (m: StockMovement) => (
            <span className="font-medium">{m.product_name}</span>
          )},
          { key: "type", label: "Type", render: (m: StockMovement) => typeBadge(m.type) },
          { key: "quantity", label: "Qty", render: (m: StockMovement) => (
            <span className={`font-medium ${m.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
              {m.type === "in" ? "+" : "-"}{m.quantity}
            </span>
          )},
          { key: "previous_stock", label: "Before" },
          { key: "new_stock", label: "After" },
          { key: "notes", label: "Notes" },
        ]}
        emptyMessage="No stock movements recorded"
      />
    </div>
  )
}
