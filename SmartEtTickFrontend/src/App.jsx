import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './AppContext'
import './index.css'

import Dashboard from './pages/Dashboard'
import Scanner from './pages/Scanner'
import Historique from './pages/Historique'
import Analytique from './pages/Analytique'
import Profil from './pages/Profil'
import Parametres from './pages/Parametres'

import Connexion from './pages/Authentification/Connexion'
import Inscription from './pages/Authentification/Inscription'
import MotDePasseOublie from './pages/Authentification/MotDePasseOublie'
import ReinitialiserMotDePasse from './pages/Authentification/ReinitialiserMotDePasse'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '▦', label: 'Tableau de bord', badge: null },
  { id: 'scanner', icon: '⊙', label: 'Ajouter ticket', badge: 'IA' },
  { id: 'historique', icon: '≡', label: 'Historique', badge: null },
  { id: 'analytique', icon: '◑', label: 'Analytique', badge: null },
]

const PAGE_TITLES = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de vos finances' },
  scanner: { title: 'Ajouter un ticket', subtitle: 'Scan OCR ou saisie manuelle' },
  historique: { title: 'Historique', subtitle: 'Tous vos tickets analysés' },
  analytique: { title: 'Analytique', subtitle: 'Répartition de vos dépenses' },
  profil: { title: 'Mon Profil', subtitle: 'Informations personnelles et abonnement' },
  parametres: { title: 'Paramètres', subtitle: 'Préférences d\'affichage et notifications' },
}

function MainLayout() {
  const [activePage, setActivePage] = useState('dashboard')
  const { theme, toggleTheme, user } = useApp()
  const info = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />
      case 'scanner': return <Scanner />
      case 'historique': return <Historique />
      case 'analytique': return <Analytique />
      case 'profil': return <Profil />
      case 'parametres': return <Parametres />
      default: return <Dashboard />
    }
  }

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🧾</div>
          <div className="sidebar-logo-text">Smart<span>&</span>Tick</div>
        </div>

        <p className="sidebar-section-label">Navigation</p>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <p className="sidebar-section-label" style={{ marginTop: 'auto' }}>Apparence</p>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '🌙 Mode sombre' : '☀️ Mode clair'}
          <div className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`} />
        </button>

        <p className="sidebar-section-label">Réglages</p>
        <button
          className={`nav-item ${activePage === 'parametres' ? 'active' : ''}`}
          onClick={() => setActivePage('parametres')}
        >
          <span className="nav-icon">⚙</span> Paramètres
        </button>

        <div className="sidebar-footer">
          <div
            className={`sidebar-user ${activePage === 'profil' ? 'active' : ''}`}
            onClick={() => setActivePage('profil')}
          >
            <div className="avatar">
              {user?.prenom && user?.nom
                ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase()
                : (user?.pseudo || "U").substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">
                {user?.prenom} {user?.nom} {(!user?.prenom && !user?.nom) && user?.pseudo} <span className="bdd-tag" style={{ border: 'none', background: 'transparent', padding: 0 }}>api</span>
              </div>
              <div className="user-role">
                {user?.abonnement === 'Premium' ? 'Premium' : 'Standard'} <span className="bdd-tag" style={{ border: 'none', background: 'transparent', padding: 0 }}>api</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">
        {/* TopBar */}
        <header className="topbar">
          <div>
            <div className="topbar-title">{info.title}</div>
            <div className="topbar-subtitle">{info.subtitle}</div>
          </div>
          <div className="topbar-actions">
            <div className="icon-btn">
              🔔
              <span className="notification-dot" />
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="page">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

function AuthLayout() {
  const [authPage, setAuthPage] = useState('login')
  const { login } = useApp()

  // Extract 'token' from URL query params (e.g. ?token=...)
  const params = new URLSearchParams(window.location.search)
  const resetToken = params.get('token')

  useEffect(() => {
    if (resetToken && authPage !== 'reset-password') {
      setAuthPage('reset-password')
    }
  }, [resetToken])

  switch (authPage) {
    case 'login': return <Connexion onLogin={login} onNavigate={setAuthPage} />
    case 'register': return <Inscription onRegister={login} onNavigate={setAuthPage} />
    case 'forgot-password': return <MotDePasseOublie onNavigate={setAuthPage} />
    case 'reset-password': return <ReinitialiserMotDePasse onNavigate={setAuthPage} token={resetToken} />
    default: return <Connexion onLogin={login} onNavigate={setAuthPage} />
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

function AppRouter() {
  const { isAuthenticated, isAuthLoading } = useApp()

  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>Chargement...</div>
      </div>
    )
  }

  return isAuthenticated ? <MainLayout /> : <AuthLayout />
}
