"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchBar } from "@/components/ui/search-bar"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { formatCurrency, isOnline } from "@/lib/utils"
import { Plus, Pencil, Trash2, Users, CreditCard } from "lucide-react"
import type { Customer } from "@/types"

export default function CustomersPage() {
  const { user } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", credit_limit: 0, notes: "" })

  const canSupabase = () => !useAuthStore.getState().isDemoMode && isOnline()

  const loadCustomers = async () => {
    if (!user) return
    if (canSupabase()) {
      const { data } = await supabase.from("customers").select("*").eq("user_id", user.id)
      if (data && data.length > 0) { setCustomers(data as Customer[]); return }
    }
    const data = await db.customers.where("user_id").equals(user.id).toArray()
    setCustomers(data)
  }

  useEffect(() => {
    if (user) loadCustomers()
  }, [user])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  const totalCredit = customers.reduce((sum, c) => sum + c.current_balance, 0)

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", phone: "", email: "", address: "", credit_limit: 0, notes: "" })
    setShowDialog(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, email: c.email || "", address: c.address || "", credit_limit: c.credit_limit, notes: c.notes || "" })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!user) return
    const data = { ...form, user_id: user.id, current_balance: editing?.current_balance || 0, loyalty_points: editing?.loyalty_points || 0 }
    if (editing) {
      const updated = { ...data, updated_at: new Date().toISOString() }
      if (canSupabase()) await supabase.from("customers").update(updated).eq("id", editing.id)
      await db.customers.update(editing.id, updated)
      await addToSyncQueue("customers", "update", editing.id, updated)
    } else {
      const customer: Customer = { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (canSupabase()) await supabase.from("customers").insert(customer)
      await db.customers.add(customer)
      await addToSyncQueue("customers", "create", customer.id, customer)
    }
    setShowDialog(false)
    loadCustomers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return
    if (canSupabase()) await supabase.from("customers").delete().eq("id", id)
    await db.customers.delete(id)
    await addToSyncQueue("customers", "delete", id, { id })
    loadCustomers()
  }

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer relationships">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {customers.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {formatCurrency(totalCredit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Credit/Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.length > 0 ? formatCurrency(totalCredit / customers.length) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "name", label: "Name", render: (c: Customer) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                {c.name[0]}
              </div>
              <div>
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="text-xs text-muted-foreground ml-2">{c.email}</span>}
              </div>
            </div>
          )},
          { key: "phone", label: "Phone" },
          { key: "current_balance", label: "Balance", render: (c: Customer) => (
            <span className={c.current_balance > 0 ? "text-amber-600 font-medium" : ""}>
              {formatCurrency(c.current_balance)}
            </span>
          )},
          { key: "credit_limit", label: "Limit", render: (c: Customer) => formatCurrency(c.credit_limit) },
          { key: "loyalty_points", label: "Points", render: (c: Customer) => (
            <Badge variant="secondary">{c.loyalty_points} pts</Badge>
          )},
          { key: "actions", label: "", render: (c: Customer) => (
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c) }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )},
        ]}
        emptyMessage="No customers yet"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Customer Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Credit Limit (RWF)</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
