import { useApp } from '../AppContext'

const PRIMARY_LINKS = [
  {
    id: 'profil',
    icon: '\u{1F464}',
    title: 'Mon profil',
    description: 'Informations personnelles et abonnement',
  },
  {
    id: 'parametres',
    icon: '\u2699',
    title: 'Parametres',
    description: 'Theme, periode et notifications',
  },
]

const SECONDARY_LINKS = [
  {
    id: 'historique',
    icon: '\u{1F5C2}',
    title: 'Historique',
    description: 'Retrouver tous les tickets analyses',
  },
  {
    id: 'analytique',
    icon: '\u25F4',
    title: 'Analytique',
    description: 'Explorer les categories et tendances',
  },
]

function MobileMoreLink({ item, onNavigate }) {
  return (
    <button
      type="button"
      className="mobile-more-link"
      onClick={() => onNavigate(item.id)}
    >
      <span className="mobile-more-link-icon" aria-hidden="true">{item.icon}</span>
      <span className="mobile-more-link-copy">
        <span className="mobile-more-link-title">{item.title}</span>
        <span className="mobile-more-link-description">{item.description}</span>
      </span>
      <span className="mobile-more-link-chevron" aria-hidden="true">{'\u203A'}</span>
    </button>
  )
}

export default function Autres({ onNavigate }) {
  const { user } = useApp()

  const displayName = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.pseudo || 'Utilisateur'
  const initials = user?.prenom && user?.nom
    ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase()
    : displayName.substring(0, 2).toUpperCase()

  return (
    <div className="mobile-more-page">
      <div className="card mobile-more-hero animate-in">
        <div className="mobile-more-avatar">{initials}</div>
        <div className="mobile-more-hero-copy">
          <div className="mobile-more-eyebrow">Autres</div>
          <div className="mobile-more-name">{displayName}</div>
          <div className="mobile-more-subtitle">
            Retrouvez ici le profil, les reglages et les vues secondaires.
          </div>
        </div>
      </div>

      <div className="card animate-in animate-delay-1" style={{ marginTop: 18 }}>
        <div className="section-header">
          <span className="section-title">Compte</span>
        </div>
        <div className="mobile-more-list">
          {PRIMARY_LINKS.map((item) => (
            <MobileMoreLink key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div className="card animate-in animate-delay-2" style={{ marginTop: 18 }}>
        <div className="section-header">
          <span className="section-title">Analyses et donnees</span>
        </div>
        <div className="mobile-more-list">
          {SECONDARY_LINKS.map((item) => (
            <MobileMoreLink key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  )
}
