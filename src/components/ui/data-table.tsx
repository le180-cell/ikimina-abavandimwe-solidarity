"use client"

import { cn } from "@/lib/utils"
import { Package } from "lucide-react"
import type React from "react"

interface DataTableProps<T> {
  data: T[]
  columns: {
    key: string
    label: string
    render?: (item: T) => React.ReactNode
    className?: string
    sortable?: boolean
  }[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
          <Package className="h-5 w-5" />
        </div>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", col.className)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              className={cn(
                "border-b last:border-0 transition-colors",
                onRowClick && "cursor-pointer",
                index % 2 === 0 ? "bg-background" : "bg-muted/20",
                onRowClick && "hover:bg-accent/40"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-sm", col.className)}>
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
