import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from './services/authApi'

const AppContext = createContext()

export function AppProvider({ children }) {
    const [theme, setTheme] = useState('dark')
    const [period, setPeriod] = useState(1)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        const isTemporaryBackendIssue = (error) => {
            const message = error?.message || ''
            return message.includes('temps à répondre')
                || message.includes('Failed to fetch')
        }

        const checkAuth = async () => {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    const userData = await authApi.getMe()
                    setUser(userData)
                    setIsAuthenticated(true)
                } catch (error) {
                    // Keep the token when the backend is only slow or temporarily down.
                    console.error('Impossible de verifier la session', error)
                    if (!isTemporaryBackendIssue(error)) {
                        localStorage.removeItem('token')
                    }
                    setIsAuthenticated(false)
                    setUser(null)
                }
            }
            setIsAuthLoading(false)
        }

        checkAuth()
    }, [])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))
    }

    const login = async () => {
        try {
            const userData = await authApi.getMe()
            setUser(userData)
            setIsAuthenticated(true)
        } catch (error) {
            console.error('Erreur post-login User Fetch', error)
        }
    }

    const logout = async () => {
        await authApi.logout()
        setIsAuthenticated(false)
        setUser(null)
    }

    return (
        <AppContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
                period,
                setPeriod,
                isAuthenticated,
                login,
                logout,
                isAuthLoading,
                user,
                setUser,
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
