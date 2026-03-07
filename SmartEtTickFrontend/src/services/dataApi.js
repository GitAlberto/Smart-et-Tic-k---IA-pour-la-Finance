const BASE_URL = 'http://localhost:8000/data'

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

    const response = await fetch(`${BASE_URL}${url}`, {
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
    }
}
