import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { dataApi } from '../services/dataApi'
import { authApi } from '../services/authApi'

export default function Profil() {
    const { logout, user } = useApp()

    const [lifetimeStats, setLifetimeStats] = useState({
        tickets: 0,
        montant: 0,
        mois: 0
    })

    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        prenom: '',
        nom: '',
        ville: '',
        code_postal: '',
        budget_fixe: 1500
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (user) {
            setEditForm({
                prenom: user.prenom || '',
                nom: user.nom || '',
                ville: user.ville || '',
                code_postal: user.code_postal || '',
                budget_fixe: user.budget_fixe || 1500
            })
        }
    }, [user])

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

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await authApi.updateProfile(editForm)
            setIsEditing(false)
            // Refresh to update context user
            window.location.reload()
        } catch (err) {
            console.error("Erreur mise à jour profil:", err)
            alert("Erreur lors de la mise à jour : " + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte, vos tickets et vos articles ? Cette action est irréversible.")) {
            setIsDeleting(true)
            try {
                await authApi.deleteAccount()
                logout()
            } catch (err) {
                console.error("Erreur suppression compte:", err)
                alert("Erreur lors de la suppression du compte : " + err.message)
                setIsDeleting(false)
            }
        }
    }

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
                <div style={{ marginRight: 24 }}>
                    <div className="sidebar-logo" style={{ margin: 0 }}>
                        <div className="sidebar-logo-icon">🧾</div>
                        <div className="sidebar-logo-text">Smart<span>&</span>Tick</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* ── Informations personnelles ── */}
                <div className="card animate-in animate-delay-1">
                    <div className="section-header">
                        <span className="section-title">Informations personnelles</span>
                        {!isEditing ? (
                            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setIsEditing(true)}>Éditer</button>
                        ) : (
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={isSaving} onClick={handleSave}>
                                {isSaving ? "Sauvegarde..." : "Sauvegarder"} <span className="bdd-tag" style={{ background: 'transparent', border: 'none' }}>api</span>
                            </button>
                        )}
                    </div>

                    <div className="form-grid" style={{ marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Prénom</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={isEditing ? editForm.prenom : prenom}
                                    readOnly={!isEditing}
                                    onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                                />
                                {!isEditing && <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nom</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={isEditing ? editForm.nom : nom}
                                    readOnly={!isEditing}
                                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                                />
                                {!isEditing && <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>}
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
                                <input
                                    type="text"
                                    className="form-input"
                                    value={isEditing ? editForm.ville : (user?.ville || "")}
                                    readOnly={!isEditing}
                                    onChange={(e) => setEditForm({ ...editForm, ville: e.target.value })}
                                />
                                {!isEditing && <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Code postal</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={isEditing ? editForm.code_postal : (user?.code_postal || "")}
                                    readOnly={!isEditing}
                                    onChange={(e) => setEditForm({ ...editForm, code_postal: e.target.value })}
                                />
                                {!isEditing && <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16, marginTop: 16 }}>
                        <label className="form-label">Budget Fixe Mensuel (€)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                className="form-input"
                                value={isEditing ? editForm.budget_fixe : (user?.budget_fixe || 1500)}
                                readOnly={!isEditing}
                                onChange={(e) => setEditForm({ ...editForm, budget_fixe: parseFloat(e.target.value) || 0 })}
                            />
                            {!isEditing && <span className="bdd-tag" style={{ position: 'absolute', right: 10, top: 12 }}>api</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Définit votre limite pour la KPI "Économies" du Dashboard.</div>
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

        </div >
    )
}
