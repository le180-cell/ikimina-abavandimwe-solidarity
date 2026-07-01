import { create } from "zustand"
import { supabase } from "@/lib/supabase/client"
import { generateId } from "@/lib/utils"
import type { User } from "@/types"

const DEMO_USER_KEY = "eliteflow_demo_user"

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isDemoMode: boolean
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (data: {
    name: string
    email: string
    password: string
    business_name: string
    phone?: string
  }) => Promise<{ error?: string }>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

function getDemoUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(DEMO_USER_KEY)
  return stored ? JSON.parse(stored) : null
}

function setDemoUser(user: User) {
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
}

function clearDemoUser() {
  localStorage.removeItem(DEMO_USER_KEY)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isDemoMode: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (email, password) => {
    // Try Supabase first
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") === false) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error && data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle()
        const userData: User = profile || {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split("@")[0],
          role: "admin",
          business_name: data.user.user_metadata?.business_name || "My Business",
          phone: data.user.user_metadata?.phone || "",
          created_at: data.user.created_at || new Date().toISOString(),
        }
        set({ user: userData, isAuthenticated: true, isDemoMode: false })
        return {}
      }
    }

    // Fallback: Demo mode with any credentials
    const demoUser: User = {
      id: generateId(),
      email: email,
      name: email.split("@")[0],
      role: "admin",
      business_name: "My Business",
      phone: "",
      created_at: new Date().toISOString(),
    }
    setDemoUser(demoUser)
    set({ user: demoUser, isAuthenticated: true, isDemoMode: true })
    return {}
  },

  register: async ({ name, email, password, business_name, phone }) => {
    // Try Supabase first
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") === false) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, business_name, phone } },
      })
      if (error) return { error: error.message }
      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          email,
          name,
          role: "admin",
          business_name,
          phone,
          created_at: new Date().toISOString(),
        }
        const { error: insertError } = await supabase.from("users").insert(newUser)
        if (insertError) {
          // Gracefully handle missing table or RLS - still log user in
          set({ user: newUser, isAuthenticated: true, isDemoMode: false })
          return {}
        }
        set({ user: newUser, isAuthenticated: true, isDemoMode: false })
        return {}
      }
    }

    // Fallback: Demo mode
    const demoUser: User = {
      id: generateId(),
      email,
      name,
      role: "admin",
      business_name,
      phone: phone || "",
      created_at: new Date().toISOString(),
    }
    setDemoUser(demoUser)
    set({ user: demoUser, isAuthenticated: true, isDemoMode: true })
    return {}
  },

  logout: async () => {
    if (!get().isDemoMode) {
      await supabase.auth.signOut()
    }
    clearDemoUser()
    set({ user: null, isAuthenticated: false })
  },

  initialize: async () => {
    try {
      // Check for existing Supabase session
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") === false) {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle()
          const userData: User = profile || {
            id: data.session.user.id,
            email: data.session.user.email || "",
            name: data.session.user.user_metadata?.name || "User",
            role: "admin",
            business_name: data.session.user.user_metadata?.business_name || "My Business",
            phone: data.session.user.user_metadata?.phone || "",
            created_at: data.session.user.created_at || new Date().toISOString(),
          }
          set({ user: userData, isAuthenticated: true, isLoading: false })
          return
        }
      }
    } catch {
      // Supabase unavailable — fall through to demo check
    }

    // Check for demo user in localStorage
    const demoUser = getDemoUser()
    if (demoUser) {
      set({ user: demoUser, isAuthenticated: true, isLoading: false, isDemoMode: true })
      return
    }

    set({ isLoading: false })
  },
}))
