// src/lib/types/auth.ts
export interface User {
  id: string
  email: string
}

export interface UserCreate {
  email: string
  password: string
}

export interface Token {
  access_token: string
}
