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
      'Content-Type': 'application/json'
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
    const { requireAuth = true, headers = {}, body, ...restOptions } = options

    const requestHeaders = requireAuth 
      ? { ...this.getAuthHeaders(), ...headers }
      : { 'Content-Type': 'application/json', ...headers }

    // Validate and prepare request body
    let requestBody: string | undefined
    if (body !== undefined) {
      if (typeof body === 'string') {
        // If body is already a string, validate it's valid JSON
        try {
          JSON.parse(body)
          requestBody = body
        } catch (error) {
          console.error('Invalid JSON string provided as body:', body)
          throw new Error('Request body must be valid JSON')
        }
      } else {
        // Convert object to JSON string
        try {
          requestBody = JSON.stringify(body)
        } catch (error) {
          console.error('Failed to stringify request body:', body)
          throw new Error('Request body cannot be serialized to JSON')
        }
      }
    }

    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      body: requestBody
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
      
      // Try to parse error response
      let errorData
      try {
        const errorText = await response.text()
        if (errorText) {
          errorData = JSON.parse(errorText)
        }
      } catch (parseError) {
        console.error('Failed to parse error response')
      }
      
      const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }

    // Parse response JSON with error handling
    try {
      return await response.json()
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError)
      throw new Error('Invalid JSON response from server')
    }
  }

  // Convenience methods
  async get<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data,
      ...options
    })
  }

  async patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data,
      ...options
    })
  }

  async put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data,
      ...options
    })
  }

  async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      method: 'DELETE',
      ...options
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient 