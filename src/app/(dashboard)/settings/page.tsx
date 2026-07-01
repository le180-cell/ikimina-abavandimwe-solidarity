"use client"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth-store"
import { fullSync } from "@/lib/db/sync"
import { Cloud, RefreshCw, Globe } from "lucide-react"
import { useState } from "react"

const version = "1.0.0"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    if (!user) return
    setSyncing(true)
    await fullSync(user.id)
    setSyncing(false)
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your business profile and preferences" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Your business information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input value={user?.business_name || ""} readOnly />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={user?.phone || "Not set"} readOnly />
            </div>
            <div>
              <Label>Account Type</Label>
              <Input value={user?.role || "Admin"} readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync & Offline</CardTitle>
            <CardDescription>Manage data synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Cloud Sync</p>
                  <p className="text-xs text-muted-foreground">Data syncs automatically when online</p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Offline Mode</p>
                  <p className="text-xs text-muted-foreground">Full functionality without internet</p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <Button onClick={handleSync} disabled={syncing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Force Sync Now"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App Info</CardTitle>
            <CardDescription>Version and support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Version</span><Badge variant="secondary">v{version || "1.0.0"}</Badge></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Build</span><span className="text-sm">Next.js 16 + Supabase</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Languages</span><span className="text-sm">English, Kinyarwanda (coming)</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
