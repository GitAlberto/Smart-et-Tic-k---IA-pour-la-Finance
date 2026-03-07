import { useState, useEffect } from 'react'
import { dataApi } from '../services/dataApi'

const CATS = ['Toutes', 'Alimentation', 'Boissons', 'Hygiène', 'Entretien', 'Restauration', 'Divers', 'Services', 'Transport', 'Logement', 'Santé', 'Loisirs']

const CAT_COLORS = {
    Alimentation: '#38d39f',
    Boissons: '#3ac8d9',
    Entretien: '#9b8af7',
    Hygiène_et_Beauté: '#4f8ef7',
    Restauration: '#f5c542',
    'Divers/Bazar': '#f05252',
}

export default function Historique() {
    const [cat, setCat] = useState('Toutes')
    const [sort, setSort] = useState('date')
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAllTickets = async () => {
            setLoading(true)
            try {
                // Fetch ALL tickets without period limit for history
                const t = await dataApi.getTickets()
                setTickets(t)
            } catch (err) {
                console.error("Erreur Historique :", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAllTickets()
    }, [])

    const filtered = tickets
        .filter(t => cat === 'Toutes' || (t.categorie?.nom || "Non catégorisé") === cat)
        .sort((a, b) => {
            if (sort === 'montant') return b.montant_total - a.montant_total
            return new Date(b.date_achat) - new Date(a.date_achat)
        })

    const total = filtered.reduce((s, t) => s + Number(t.montant_total), 0)

    if (loading) return <div>Chargement de votre historique complet...</div>

    return (
        <div>
            {/* Stats rapides */}
            <div className="grid-3" style={{ marginBottom: 20 }}>
                {[
                    { label: <>Total tickets <span className="bdd-tag">bdd</span></>, value: filtered.length, icon: '🧾' },
                    { label: <>Montant total <span className="bdd-tag">bdd</span></>, value: `${total.toFixed(2)} €`, icon: '💶' },
                    { label: <>Moy. par ticket <span className="bdd-tag">bdd</span></>, value: `${(total / (filtered.length || 1)).toFixed(2)} €`, icon: '📊' },
                ].map((s, i) => (
                    <div key={i} className="card animate-in" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ fontSize: 28 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtres */}
            <div className="card animate-in animate-delay-1" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div className="filters-bar">
                        {CATS.map(c => (
                            <button
                                key={c}
                                className={`filter-chip ${cat === c ? 'active' : ''}`}
                                onClick={() => setCat(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="date">Trier par date</option>
                        <option value="montant">Trier par montant</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card animate-in animate-delay-2">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Magasin</th>
                            <th>Date</th>
                            <th>Catégorie principale</th>
                            <th>Articles</th>
                            <th>Montant</th>
                            <th>Statut</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((t, idx) => {
                            const color = t.categorie?.code_couleur_hex || '#4f8ef7'
                            const catName = t.categorie?.nom || "Non catégorisé"
                            return (
                                <tr key={t.id} style={{ cursor: 'pointer' }}>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{idx + 1}</td>
                                    <td style={{ fontWeight: 600 }}>🏪 {t.nom_marchand}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>{new Date(t.date_achat).toLocaleDateString()}</td>
                                    <td>
                                        <span className="badge" style={{ background: color + '20', color }}>
                                            {catName}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.articles?.length || 0} art.</td>
                                    <td>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                                            {Number(t.montant_total).toFixed(2)} €
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.statut === 'validé' ? 'badge-green' : 'badge-gold'}`}>
                                            {t.statut === 'validé' ? '✓' : '⏳'} {t.statut}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-icon-only" style={{ fontSize: 12, padding: '5px 10px' }}>
                                            Voir
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
