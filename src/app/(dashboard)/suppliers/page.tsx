"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchBar } from "@/components/ui/search-bar"
import { db } from "@/lib/db/offline"
import { supabase } from "@/lib/supabase/client"
import { addToSyncQueue } from "@/lib/db/sync"
import { isOnline } from "@/lib/utils"
import { Plus, Pencil, Trash2, Truck } from "lucide-react"
import type { Supplier } from "@/types"

export default function SuppliersPage() {
  const { user } = useAuthStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", tax_id: "", payment_terms: "", notes: "" })

  const canSupabase = () => !useAuthStore.getState().isDemoMode && isOnline()

  const loadSuppliers = async () => {
    if (!user) return
    if (canSupabase()) {
      const { data } = await supabase.from("suppliers").select("*").eq("user_id", user.id)
      if (data && data.length > 0) { setSuppliers(data as Supplier[]); return }
    }
    const data = await db.suppliers.where("user_id").equals(user.id).toArray()
    setSuppliers(data)
  }

  useEffect(() => {
    if (user) loadSuppliers()
  }, [user])

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  )

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", contact_person: "", phone: "", email: "", address: "", tax_id: "", payment_terms: "", notes: "" })
    setShowDialog(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({ name: s.name, contact_person: s.contact_person || "", phone: s.phone, email: s.email || "", address: s.address || "", tax_id: s.tax_id || "", payment_terms: s.payment_terms || "", notes: s.notes || "" })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!user) return
    const data = { ...form, user_id: user.id }
    if (editing) {
      const updated = { ...data, updated_at: new Date().toISOString() }
      if (canSupabase()) {
        await supabase.from("suppliers").update(updated).eq("id", editing.id)
      }
      await db.suppliers.update(editing.id, updated)
      await addToSyncQueue("suppliers", "update", editing.id, updated)
    } else {
      const supplier: Supplier = { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (canSupabase()) {
        await supabase.from("suppliers").insert(supplier)
      }
      await db.suppliers.add(supplier)
      await addToSyncQueue("suppliers", "create", supplier.id, supplier)
    }
    setShowDialog(false)
    loadSuppliers()
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this supplier?")) {
      if (canSupabase()) {
        await supabase.from("suppliers").delete().eq("id", id)
      }
      await db.suppliers.delete(id)
      await addToSyncQueue("suppliers", "delete", id, { id })
      loadSuppliers()
    }
  }

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage your suppliers">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </PageHeader>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "name", label: "Supplier", render: (s: Supplier) => (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{s.name}</span>
            </div>
          )},
          { key: "contact_person", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "payment_terms", label: "Terms" },
          { key: "actions", label: "", render: (s: Supplier) => (
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(s) }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )},
        ]}
        emptyMessage="No suppliers yet"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Company Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="col-span-2"><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. Net 30" /></div>
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
