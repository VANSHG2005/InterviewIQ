import { create } from 'zustand'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── Zustand auth store ───────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user:        null,
  token:       localStorage.getItem('iq_token') || null,
  initialized: false,
  loading:     false,

  // Called once on app mount to rehydrate session
  init: async () => {
    const token = localStorage.getItem('iq_token')
    if (!token) { set({ initialized: true }); return }
    try {
      const res  = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user, token, initialized: true })
      } else {
        localStorage.removeItem('iq_token')
        set({ user: null, token: null, initialized: true })
      }
    } catch {
      set({ initialized: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    const res  = await fetch(`${BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    set({ loading: false })
    if (!res.ok) throw new Error(data.message || 'Login failed')
    localStorage.setItem('iq_token', data.token)
    set({ user: data.user, token: data.token })
    return data
  },

  signup: async (name, email, password) => {
    set({ loading: true })
    const res  = await fetch(`${BASE}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    set({ loading: false })
    if (!res.ok) throw new Error(data.message || 'Signup failed')
    localStorage.setItem('iq_token', data.token)
    set({ user: data.user, token: data.token })
    return data
  },

  logout: () => {
    localStorage.removeItem('iq_token')
    set({ user: null, token: null })
  },
}))

// ─── Authenticated fetch helper ───────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('iq_token')
  const res   = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}
