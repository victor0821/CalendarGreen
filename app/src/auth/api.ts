import { request } from '../api/client'

export interface User {
  id: string
  email: string
  timezone: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export const authApi = {
  register: (email: string, password: string, timezone: string) =>
    request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, timezone },
      auth: false,
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  me: () => request<User>('/auth/me'),
}
