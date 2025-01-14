// src/services/auth.service.ts
import { API_URL } from '@/utils'
import type { User, UserCreate } from '@/lib/types/auth'

export function setAuthToken(token: string) {
  // Store in localStorage and set cookie consistently
  localStorage.setItem('token', token)
  document.cookie = `token=${token}; path=/`
}

export function clearAuthToken() {
  localStorage.removeItem('token')
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export const authService = {
  getAuthHeader() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  async register(userData: UserCreate): Promise<User> {
    console.log('API_URL REGISTER : ', API_URL)
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }

    return response.json()
  },

  async signIn(email: string, password: string): Promise<{ token: string; user: User }> {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    console.log('API_URL LOGIN : ', API_URL)
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw error
    }

    const token = await response.json()
    setAuthToken(token.access_token)

    const userResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    })

    const userData = await userResponse.json()
    localStorage.setItem('user', JSON.stringify(userData))

    return {
      token: token.access_token,
      user: userData
    }
  },

  signOut(): void {
    clearAuthToken()
    localStorage.removeItem('user')
    window.location.href = '/signin'
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },

  getToken(): string | null {
    return localStorage.getItem('token')
  },

  getUser(): User | null {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  }
}
