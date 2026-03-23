const BASE_URL = 'http://localhost:8000/auth'
const DEFAULT_TIMEOUT_MS = 6000

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        })
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Le serveur met trop de temps à répondre.')
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * Helper component for authenticated fetch
 */
const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
        ...options,
        headers
    })

    // We parse JSON unless it's a 204 No Content
    let data = null
    if (response.status !== 204) {
        try {
            data = await response.json()
        } catch (e) {
            console.error('Error parsing JSON response', e)
        }
    }

    if (!response.ok) {
        const errorMsg = data?.detail || 'Une erreur est survenue'
        throw new Error(errorMsg)
    }

    return data
}

export const authApi = {
    register: async (pseudo, email, password) => {
        return authFetch('/register', {
            method: 'POST',
            body: JSON.stringify({ pseudo, email, password })
        })
    },

    login: async (loginIdentifier, password) => {
        // API returns access_token
        const data = await authFetch('/login', {
            method: 'POST',
            body: JSON.stringify({ login: loginIdentifier, password })
        })
        if (data.access_token) {
            localStorage.setItem('token', data.access_token)
        }
        return data
    },

    logout: async () => {
        try {
            // Intentionally call the backend to blacklist the token
            await authFetch('/logout', { method: 'POST' })
        } catch (err) {
            console.warn('Logout fallback (token expired/invalid)', err)
        } finally {
            // Always remove token locally
            localStorage.removeItem('token')
        }
    },

    forgotPassword: async (email) => {
        return authFetch('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        })
    },

    resetPassword: async (token, newPassword) => {
        return authFetch('/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword })
        })
    },

    // Used to check if current token is valid and get user info
    getMe: async () => {
        return authFetch('/me', {
            method: 'GET'
        })
    },

    updateProfile: async (profileData) => {
        return authFetch('/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        })
    },

    deleteAccount: async () => {
        return authFetch('/me', {
            method: 'DELETE'
        })
    }
}
