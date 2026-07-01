import { db } from "./offline"
import { supabase } from "@/lib/supabase/client"
import { isOnline } from "@/lib/utils"
import type { SyncQueueItem } from "@/types"

export async function addToSyncQueue(
  table: string,
  operation: "create" | "update" | "delete",
  recordId: string,
  data: any
) {
  await db.syncQueue.add({
    table,
    operation,
    record_id: recordId,
    data,
    status: "pending",
    created_at: new Date().toISOString(),
  })

  if (isOnline()) {
    await processSyncQueue()
  }
}

export async function processSyncQueue() {
  if (!isOnline()) return

  const pendingItems = await db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("created_at")

  for (const item of pendingItems) {
    try {
      await db.syncQueue.update(item.id!, { status: "syncing" })

      const { error } = await syncRecord(item)

      if (error) {
        await db.syncQueue.update(item.id!, {
          status: "failed",
          error: error.message,
        })
      } else {
        await db.syncQueue.delete(item.id!)
      }
    } catch (err: any) {
      await db.syncQueue.update(item.id!, {
        status: "failed",
        error: err.message,
      })
    }
  }
}

async function syncRecord(item: SyncQueueItem): Promise<{ error?: any }> {
  const { table, operation, record_id, data } = item

  switch (operation) {
    case "create": {
      const { error } = await supabase.from(table).insert(data)
      return { error }
    }
    case "update": {
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq("id", record_id)
      return { error }
    }
    case "delete": {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", record_id)
      return { error }
    }
    default:
      return { error: new Error("Unknown operation") }
  }
}

export async function pullFromServer(table: string, userId: string, lastSync?: string) {
  if (!isOnline()) return

  let query = supabase.from(table).select("*").eq("user_id", userId)

  if (lastSync) {
    query = query.gte("updated_at", lastSync)
  }

  const { data, error } = await query

  if (error) throw error

  if (data) {
    const dexieTable = (db as any)[table]
    if (dexieTable) {
      await dexieTable.bulkPut(data)
    }
  }

  return data
}

export async function fullSync(userId: string) {
  if (!isOnline()) return { error: new Error("No internet connection") }

  try {
    await processSyncQueue()

    const tables = [
      "products",
      "categories",
      "stockBatches",
      "stockMovements",
      "suppliers",
      "customers",
      "sales",
      "purchaseOrders",
    ]

    for (const table of tables) {
      await pullFromServer(table, userId)
    }

    return { success: true }
  } catch (error: any) {
    return { error }
  }
}
