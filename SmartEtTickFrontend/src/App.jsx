import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './AppContext'
import './index.css'

import Dashboard from './pages/Dashboard'
import Scanner from './pages/Scanner'
import Historique from './pages/Historique'
import Analytique from './pages/Analytique'
import Profil from './pages/Profil'
import Parametres from './pages/Parametres'
import Autres from './pages/Autres'

import Connexion from './pages/Authentification/Connexion'
import Inscription from './pages/Authentification/Inscription'
import MotDePasseOublie from './pages/Authentification/MotDePasseOublie'
import ReinitialiserMotDePasse from './pages/Authentification/ReinitialiserMotDePasse'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '\u2302', label: 'Tableau de bord', badge: null },
  { id: 'scanner', icon: '\u{1F9FE}', label: 'Ajouter ticket', badge: 'IA' },
  { id: 'historique', icon: '\u{1F5C2}', label: 'Historique', badge: null },
  { id: 'analytique', icon: '\u25F4', label: 'Analytique', badge: null },
]

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', icon: '\u2302', label: 'Accueil' },
  { id: 'scanner', icon: '\u{1F9FE}', label: 'Scan' },
  { id: 'more', icon: '\u2630', label: 'Autres' },
]

const PAGE_TITLES = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de vos finances' },
  scanner: { title: 'Ajouter un ticket', subtitle: 'Scan OCR ou saisie manuelle' },
  historique: { title: 'Historique', subtitle: 'Tous vos tickets analyses' },
  analytique: { title: 'Analytique', subtitle: 'Repartition de vos depenses' },
  profil: { title: 'Mon profil', subtitle: 'Informations personnelles et abonnement' },
  parametres: { title: 'Parametres', subtitle: 'Preferences et notifications' },
  more: { title: 'Autres', subtitle: 'Profil, reglages et pages utiles' },
}

// Sur telephone, les vues secondaires restent regroupees sous "Autres"
// pour garder une navigation proche d'une app mobile simple.
const getMobileTab = (pageId) => {
  if (pageId === 'scanner') return 'scanner'
  if (pageId === 'dashboard') return 'dashboard'
  return 'more'
}

function MainLayout() {
  const [activePage, setActivePage] = useState('dashboard')
  const [isNavOpen, setIsNavOpen] = useState(false)
  const { theme, toggleTheme, user } = useApp()
  const info = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard
  const mobileTab = getMobileTab(activePage)
  const mobileBackTarget = mobileTab === 'more' && activePage !== 'more' ? 'more' : null

  useEffect(() => {
    document.body.style.overflow = isNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isNavOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsNavOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const openPage = (pageId) => {
    setActivePage(pageId)
    setIsNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={openPage} />
      case 'scanner':
        return <Scanner />
      case 'historique':
        return <Historique />
      case 'analytique':
        return <Analytique />
      case 'profil':
        return <Profil />
      case 'parametres':
        return <Parametres />
      case 'more':
        return <Autres onNavigate={openPage} />
      default:
        return <Dashboard onNavigate={openPage} />
    }
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`sidebar-backdrop ${isNavOpen ? 'visible' : ''}`}
        aria-label="Fermer le menu"
        onClick={() => setIsNavOpen(false)}
      />

      <aside className={`sidebar ${isNavOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">{'\u{1F9FE}'}</div>
          <div className="sidebar-logo-text">Smart<span>&</span>Tick</div>
          <button
            type="button"
            className="icon-btn sidebar-close-btn"
            aria-label="Fermer la navigation"
            onClick={() => setIsNavOpen(false)}
          >
            {'\u2715'}
          </button>
        </div>

        <p className="sidebar-section-label">Navigation</p>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => openPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <p className="sidebar-section-label" style={{ marginTop: 'auto' }}>Apparence</p>
        <button type="button" className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '\u{1F319} Mode sombre' : '\u2600\uFE0F Mode clair'}
          <div className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`} />
        </button>

        <p className="sidebar-section-label">Reglages</p>
        <button
          type="button"
          className={`nav-item ${activePage === 'parametres' ? 'active' : ''}`}
          onClick={() => openPage('parametres')}
        >
          <span className="nav-icon">{'\u2699'}</span>
          Parametres
        </button>

        <div className="sidebar-footer">
          <div
            className={`sidebar-user ${activePage === 'profil' ? 'active' : ''}`}
            onClick={() => openPage('profil')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                openPage('profil')
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="avatar">
              {user?.prenom && user?.nom
                ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase()
                : (user?.pseudo || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">
                {user?.prenom} {user?.nom} {(!user?.prenom && !user?.nom) && user?.pseudo}
                {' '}
                <span className="bdd-tag" style={{ border: 'none', background: 'transparent', padding: 0 }}>api</span>
              </div>
              <div className="user-role">
                {user?.abonnement === 'Premium' ? 'Premium' : 'Standard'}
                {' '}
                <span className="bdd-tag" style={{ border: 'none', background: 'transparent', padding: 0 }}>api</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          {mobileBackTarget && (
            <button
              type="button"
              className="icon-btn mobile-back-btn"
              aria-label="Revenir a Autres"
              onClick={() => openPage(mobileBackTarget)}
            >
              {'\u2039'}
            </button>
          )}
          <button
            type="button"
            className="icon-btn mobile-nav-toggle"
            aria-label="Ouvrir la navigation"
            onClick={() => setIsNavOpen(true)}
          >
            {'\u2630'}
          </button>
          <div className="topbar-copy">
            <div className="topbar-title">{info.title}</div>
            <div className="topbar-subtitle">{info.subtitle}</div>
          </div>
          <div className="topbar-actions">
            <div className="icon-btn">
              {'\u{1F514}'}
              <span className="notification-dot" />
            </div>
          </div>
        </header>

        <main className="page">
          {renderPage()}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navigation principale mobile">
        {MOBILE_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav-item ${mobileTab === item.id ? 'active' : ''}`}
            onClick={() => openPage(item.id)}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function AuthLayout() {
  const [authPage, setAuthPage] = useState('login')
  const { login } = useApp()

  const params = new URLSearchParams(window.location.search)
  const resetToken = params.get('token')

  useEffect(() => {
    if (resetToken && authPage !== 'reset-password') {
      setAuthPage('reset-password')
    }
  }, [authPage, resetToken])

  switch (authPage) {
    case 'login':
      return <Connexion onLogin={login} onNavigate={setAuthPage} />
    case 'register':
      return <Inscription onRegister={login} onNavigate={setAuthPage} />
    case 'forgot-password':
      return <MotDePasseOublie onNavigate={setAuthPage} />
    case 'reset-password':
      return <ReinitialiserMotDePasse onNavigate={setAuthPage} token={resetToken} />
    default:
      return <Connexion onLogin={login} onNavigate={setAuthPage} />
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
