"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useProductStore } from "@/store/product-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchBar } from "@/components/ui/search-bar"
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react"
import type { Category } from "@/types"

export default function CategoriesPage() {
  const { user } = useAuthStore()
  const { categories, fetchCategories, addCategory, updateCategory, deleteCategory } = useProductStore()
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", description: "" })

  useEffect(() => {
    if (user) fetchCategories(user.id)
  }, [user, fetchCategories])

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", description: "" })
    setShowDialog(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || "" })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (editing) {
      await updateCategory(editing.id, form)
    } else {
      await addCategory({ ...form, user_id: user.id })
    }
    setShowDialog(false)
  }

  return (
    <div>
      <PageHeader title="Categories" description="Organize your products into categories">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
      </PageHeader>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search categories..." className="max-w-sm" />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "name", label: "Name", render: (c: Category) => (
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{c.name}</span>
            </div>
          )},
          { key: "description", label: "Description" },
          { key: "actions", label: "", render: (c: Category) => (
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c) }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this category?")) deleteCategory(c.id) }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )},
        ]}
        emptyMessage="No categories yet"
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
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
