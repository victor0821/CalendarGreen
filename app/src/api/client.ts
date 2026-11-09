/**
 * Cliente HTTP del backend. El frontend NUNCA habla con Supabase: solo con esta API.
 * Añade el token Bearer y traduce los errores `{ error: { code, message } }` a ApiError.
 */

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfterSeconds: number | undefined

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

type TokenGetter = () => string | null
type UnauthorizedHandler = () => void

let getToken: TokenGetter = () => null
let onUnauthorized: UnauthorizedHandler = () => {}

/** La sesión registra cómo leer el token y qué hacer ante un 401 de una ruta protegida. */
export function configureApi(options: {
  getToken: TokenGetter
  onUnauthorized: UnauthorizedHandler
}): void {
  getToken = options.getToken
  onUnauthorized = options.onUnauthorized
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string>
  /** false en login y registro: un 401 ahí es «credenciales incorrectas», no «sesión vencida». */
  auth?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options
  const url = query ? `${BASE}${path}?${new URLSearchParams(query).toString()}` : `${BASE}${path}`

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con el servidor. Revisa tu conexión.',
    )
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error
    const retry = Number(response.headers.get('Retry-After'))
    const apiError = new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? 'No se pudo completar la solicitud.',
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    )
    if (response.status === 401 && auth && token) onUnauthorized()
    throw apiError
  }
  return payload as T
}
