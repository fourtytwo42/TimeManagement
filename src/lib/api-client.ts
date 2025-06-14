// API client utility for making authenticated requests

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async request<T = any>(
    url: string, 
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, headers = {}, ...restOptions } = options

    const requestHeaders = requireAuth 
      ? { ...this.getAuthHeaders(), ...headers }
      : { 'Content-Type': 'application/json', ...headers }

    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    })

    if (!response.ok) {
      if (response.status === 401 && requireAuth) {
        // Token might be expired, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          window.location.href = '/auth/signin'
        }
        throw new Error('Authentication required')
      }
      
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Convenience methods
  async get<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
export default apiClient 