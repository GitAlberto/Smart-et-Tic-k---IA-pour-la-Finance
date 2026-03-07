import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from './services/authApi'

const AppContext = createContext()

export function AppProvider({ children }) {
    // Theme: 'dark' or 'light'
    const [theme, setTheme] = useState('dark')

    // Période d'affichage: 1, 2, 3, 6 (mois)
    const [period, setPeriod] = useState(1)

    // Auth & User Profile
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [user, setUser] = useState(null)

    // Vérification du token au chargement
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    const userData = await authApi.getMe()
                    setUser(userData)
                    setIsAuthenticated(true)
                } catch (err) {
                    console.error("Token invalide ou expiré", err)
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                    setUser(null)
                }
            }
            setIsAuthLoading(false)
        }
        checkAuth()
    }, [])

    // Appliquer le thème sur <html>
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    const login = async () => {
        try {
            const userData = await authApi.getMe()
            setUser(userData)
            setIsAuthenticated(true)
        } catch (e) {
            console.error("Erreur post-login User Fetch", e)
        }
    }

    const logout = async () => {
        await authApi.logout()
        setIsAuthenticated(false)
        setUser(null)
    }

    return (
        <AppContext.Provider value={{
            theme, setTheme, toggleTheme,
            period, setPeriod,
            isAuthenticated, login, logout, isAuthLoading,
            user, setUser
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
