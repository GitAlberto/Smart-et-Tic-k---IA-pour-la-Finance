import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { dataApi } from '../services/dataApi'

export default function Profil() {
    const { logout, user } = useApp()

    const [lifetimeStats, setLifetimeStats] = useState({
        tickets: 0,
        montant: 0,
        mois: 0
    })

    useEffect(() => {
        const fetchLifetime = async () => {
            try {
                // 120 mois (10 ans) pour avoir des stats "lifetime" approximées
                const s = await dataApi.getDashboardStats(120)
                const a = await dataApi.getAnalytics(120)
                setLifetimeStats({
                    tickets: s.total_tickets,
                    montant: s.total_depenses,
                    mois: Object.keys(a.monthly_totals).length
                })
            } catch (err) {
                console.error(err)
            }
        }
        fetchLifetime()
    }, [])

    // Fallbacks si les données sont vides (nouvel utilisateur)
    const prenom = user?.prenom || ""
    const nom = user?.nom || ""
    const pseudo = user?.pseudo || "Utilisateur"
    const initials = prenom && nom ? `${prenom[0]}${nom[0]}`.toUpperCase() : pseudo.substring(0, 2).toUpperCase()

    // Format the date if exists
    let memberSince = ""
    if (user?.cree_le) {
        const d = new Date(user.cree_le)
        memberSince = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* ── En-tête profil ── */}
            <div className="profile-hero animate-in">
                <div className="avatar-lg">{initials}</div>
                <div className="profile-meta">
                    <div className="profile-name">
                        {prenom} {nom} {(!prenom && !nom) && pseudo} <span className="bdd-tag">api</span>
                    </div>
                    <div className="profile-role">
                        {user?.abonnement === 'Premium' ? 'Membre Premium' : 'Membre Standard'} {memberSince && `depuis ${memberSince}`} <span className="bdd-tag">api</span>
                    </div>
                    <div className="profile-stats">
                        <div>
                            <div className="profile-stat-val">{lifetimeStats.tickets} <span className="bdd-tag">api</span></div>
                            <div className="profile-stat-label">Tickets scannés</div>
                        </div>
                        <div>
                            <div className="profile-stat-val">{lifetimeStats.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€ <span className="bdd-tag">api</span></div>
                            <div className="profile-stat-label">Analysés (total)</div>
                        </div>
                        <div>
                            <div className="profile-stat-val">{lifetimeStats.mois} <span className="bdd-tag">api</span></div>
                            <div className="profile-stat-label">Mois d'historique</div>
                        </div>
                    </div>
                </div>
                <div>
                    <button className="btn btn-ghost" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        ✏️ Modifier la photo
                    </button>
                </div>
            </div>

            <div className="grid-2">
                {/* ── Informations personnelles ── */}
                <div className="card animate-in animate-delay-1">
                    <div className="section-header">
                        <span className="section-title">Informations personnelles</span>
                        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Éditer</button>
                    </div>

                    <div className="form-grid" style={{ marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Prénom</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-input" value={prenom} readOnly />
                                <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nom</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-input" value={nom} readOnly />
                                <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <input type="email" className="form-input" value={user?.email || ""} readOnly />
                            <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Ville</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-input" value={user?.ville || ""} readOnly />
                                <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Code postal</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-input" value={user?.code_postal || ""} readOnly />
                                <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Sécurité & Abonnement ── */}
                <div className="card animate-in animate-delay-2" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="section-header">
                        <span className="section-title">Sécurité</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Mot de passe</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input type="password" className="form-input" defaultValue="••••••••••••" disabled />
                            <button className="btn btn-ghost">Modifier</button>
                        </div>
                    </div>

                    <div className="divider" style={{ margin: '10px 0 20px' }} />

                    <div className="section-header" style={{ marginBottom: 10 }}>
                        <span className="section-title">Abonnement actuel</span>
                    </div>

                    <div style={{ background: 'var(--green-dim)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>
                                    Plan {user?.abonnement || "Gratuit"} <span className="bdd-tag">api</span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {user?.abonnement === 'Premium' ? 'Facturé 4.99€/mois' : "Fonctionnalités limitées"}
                                </div>
                            </div>
                            <span className="badge badge-green">Actif</span>
                        </div>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16, background: 'var(--bg-card)' }}>
                            Gérer l'abonnement
                        </button>
                    </div>

                </div>
            </div>

            <div className="animate-in animate-delay-3" style={{ marginTop: 24, textAlign: 'right' }}>
                <button className="btn btn-danger" onClick={logout}>
                    Déconnexion <span className="bdd-tag" style={{ borderColor: 'rgba(217, 48, 37, 0.4)', color: 'var(--red)', background: 'var(--red-dim)' }}>api</span>
                </button>
            </div>

        </div>
    )
}
