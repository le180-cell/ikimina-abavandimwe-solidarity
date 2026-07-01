"use client"

import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { LogOut, User, Wifi, WifiOff } from "lucide-react"
import { isOnline, cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function Header() {
  const { user, logout } = useAuthStore()
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          online ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>
          {online ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-foreground">{user?.name || user?.email}</span>
            <span className="hidden sm:inline text-muted-foreground ml-1.5 text-xs">
              &middot; {user?.business_name}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
