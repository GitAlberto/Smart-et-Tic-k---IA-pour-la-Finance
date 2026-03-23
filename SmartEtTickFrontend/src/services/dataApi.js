const BASE_URL = 'http://localhost:8000/data'
const DEFAULT_TIMEOUT_MS = 10000
const SCAN_TIMEOUT_MS = 45000

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

export const dataApi = {
    getDashboardStats: async (periodMonths = 1) => {
        return authFetch(`/dashboard-stats?period_months=${periodMonths}`)
    },

    getTickets: async (periodMonths = null) => {
        let url = '/tickets'
        if (periodMonths) {
            url += `?period_months=${periodMonths}`
        }
        return authFetch(url)
    },

    getAnalytics: async (periodMonths = 12) => {
        return authFetch(`/analytics?period_months=${periodMonths}`)
    },

    getCategories: async () => {
        return authFetch('/categories')
    },

    scanTicket: async (imageFile) => {
        // Warning: This endpoint uses multipart/form-data, so we cannot use the
        // JSON-formatted authFetch directly for the body. We need custom headers.
        const token = localStorage.getItem('token')
        const formData = new FormData()
        formData.append('file', imageFile)

        const response = await fetchWithTimeout('http://localhost:8000/api/tickets/scan', {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData
        }, SCAN_TIMEOUT_MS)

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.detail || 'Erreur lors de l\'analyse OCR')
        }
        return response.json()
    },

    createTicket: async (ticketData) => {
        return authFetch('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData)
        })
    },

    updateTicket: async (ticketId, ticketData) => {
        return authFetch(`/tickets/${ticketId}`, {
            method: 'PUT',
            body: JSON.stringify(ticketData)
        })
    },

    deleteTicket: async (ticketId) => {
        return authFetch(`/tickets/${ticketId}`, {
            method: 'DELETE'
        })
    }
}
