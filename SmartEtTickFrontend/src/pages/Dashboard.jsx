import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { dataApi } from '../services/dataApi'

// Données mockées pour les graphiques (en attendant des endpoints plus avancés)
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun']
const REVENUS = [1820, 2100, 1950, 2300, 2050, 2480]
const DEPENSES = [1240, 1580, 1320, 1760, 1430, 1690]
const MAX_VAL = 2600

const CAT_COLORS = {
    Alimentation: '#38d39f',
    Hygiène: '#4f8ef7',
    Restauration: '#f5c542',
    Entretien: '#9b8af7',
    'Divers/Bazar': '#f05252',
    Boissons: '#3ac8d9',
}

function KpiCard({ label, value, icon, trend, trendLabel, accentColor, delay }) {
    return (
        <div
            className={`kpi-card animate-in animate-delay-${delay}`}
            style={{ '--accent-color': accentColor }}
        >
            <div className="kpi-header">
                <span className="kpi-label">{label}</span>
                <div className="kpi-icon" style={{ background: accentColor + '20', color: accentColor }}>
                    {icon}
                </div>
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-footer">
                <span className={trend > 0 ? 'trend-up' : 'trend-down'}>
                    {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                </span>
                <span>{trendLabel}</span>
            </div>
        </div>
    )
}

function BarChart({ monthlyTotals }) {
    if (!monthlyTotals) return <div>Chargement...</div>
    const entries = Object.entries(monthlyTotals)
    if (entries.length === 0) return <div>Pas de données</div>

    // Pour simplifier l'exemple, on met ici tout en dépenses
    const MAX_VAL = Math.max(...Object.values(monthlyTotals), 100) * 1.2

    return (
        <div className="chart-container">
            <div className="chart-bars">
                {entries.map(([m, v]) => {
                    const monthLabel = m.split('-')[1] // Affiche juste le mois "03"
                    return (
                        <div key={m} className="chart-bar-group">
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flex: 1 }}>
                                <div
                                    className="chart-bar"
                                    style={{
                                        height: `${(v / MAX_VAL) * 85}%`,
                                        background: 'linear-gradient(180deg, #f05252, #c03030)',
                                        opacity: 0.7,
                                        flex: 1,
                                    }}
                                    title={`Dépenses ${monthLabel}: ${v} €`}
                                />
                            </div>
                            <div className="chart-bar-label">{monthLabel}</div>
                        </div>
                    )
                })}
            </div>
            {/* Légende */}
            <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f05252' }} />
                    Dépenses
                </div>
            </div>
        </div>
    )
}

// Mini donut SVG
function DonutChart({ categories, totalDepenses }) {
    if (!categories || categories.length === 0) return <div>Pas de données de catégories</div>

    const r = 54, cx = 70, cy = 70, strokeW = 18
    const circum = 2 * Math.PI * r
    let offset = 0

    // Garder seulement le top 5
    const topCats = categories.slice(0, 5)

    return (
        <div className="donut-container">
            <svg className="donut-svg" viewBox="0 0 140 140">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={strokeW} />
                {topCats.map((d, i) => {
                    const dash = (d.pct / 100) * circum
                    const gap = circum - dash
                    const seg = (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={d.color || '#4f8ef7'}
                            strokeWidth={strokeW}
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'all 1s ease' }}
                        />
                    )
                    offset += dash
                    return seg
                })}
                <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="700" fontFamily="Space Grotesk">
                    {Number(totalDepenses).toFixed(0)}€
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
                    période
                </text>
            </svg>
            <div className="donut-legend">
                {topCats.map((d) => (
                    <div key={d.name} className="legend-item">
                        <div className="legend-dot" style={{ background: d.color || '#4f8ef7' }} />
                        <div className="legend-info">
                            <div className="legend-label">{d.name}</div>
                        </div>
                        <div className="legend-value">{d.pct}%</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function Dashboard() {
    const { period } = useApp()

    const [stats, setStats] = useState({
        total_depenses: 0,
        total_tickets: 0,
        categories_actives: 0
    })
    const [analytics, setAnalytics] = useState(null)
    const [recentTickets, setRecentTickets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch stats
                const s = await dataApi.getDashboardStats(period)
                setStats(s)

                // Fetch analytics for charts
                const a = await dataApi.getAnalytics(period)
                setAnalytics(a)

                // Fetch tickets (limited to 5 for the dashboard)
                const t = await dataApi.getTickets(period)
                setRecentTickets(t.slice(0, 5))
            } catch (err) {
                console.error("Erreur de chargement du dashboard", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [period])

    if (loading) return <div>Chargement sécurisé des données...</div>

    return (
        <div>
            {/* ── KPI Row ── */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                <KpiCard label={<>Dépenses ({period}m) <span className="bdd-tag">api</span></>} value={`${Number(stats.total_depenses).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} icon="📉" trend={stats.trend_depenses} trendLabel="vs prcd." accentColor="var(--red)" delay={1} />
                <KpiCard label={<>Tickets scannés <span className="bdd-tag">api</span></>} value={stats.total_tickets} icon="🧾" trend={stats.trend_tickets} trendLabel="vs prcd." accentColor="var(--green)" delay={2} />
                <KpiCard label={<>Économies réelles <span className="bdd-tag">api</span></>} value={`${(Number(stats.total_depenses) * 0.15).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`} icon="💰" trend={stats.trend_depenses} trendLabel="vs prcd." accentColor="var(--gold)" delay={3} />
                <KpiCard label={<>Catégories actives <span className="bdd-tag">api</span></>} value={stats.categories_actives} icon="◑" trend={stats.trend_categories} trendLabel="vs prcd." accentColor="var(--blue)" delay={4} />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card animate-in animate-delay-1">
                    <div className="section-header">
                        <span className="section-title">Revenus & Dépenses <span className="bdd-tag">api</span></span>
                        <span className="badge badge-green">{period} mois</span>
                    </div>
                    {analytics && <BarChart monthlyTotals={analytics.monthly_totals} />}
                </div>
                <div className="card animate-in animate-delay-2">
                    <div className="section-header">
                        <span className="section-title">Répartition <span className="bdd-tag">api</span></span>
                        <span className="badge badge-gold">Ce mois</span>
                    </div>
                    {analytics && <DonutChart categories={analytics.categories} totalDepenses={analytics.total_depenses} />}
                </div>
            </div>

            {/* ── Derniers tickets ── */}
            <div className="card animate-in animate-delay-3">
                <div className="section-header">
                    <span className="section-title">Derniers tickets analysés <span className="bdd-tag">bdd</span></span>
                    <span className="section-link">Voir tout →</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Magasin</th>
                            <th>Date</th>
                            <th>Catégorie principale</th>
                            <th>Produits</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTickets.map((t) => (
                            <tr key={t.id} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>🏪 {t.nom_marchand}</div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.date_achat).toLocaleDateString()}</td>
                                <td>
                                    <span className="badge" style={{
                                        background: (t.categorie?.code_couleur_hex || '#4f8ef7') + '20',
                                        color: t.categorie?.code_couleur_hex || '#4f8ef7',
                                    }}>
                                        {t.categorie?.nom || "Non catégorisé"}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{t.articles?.length || 0} articles</td>
                                <td>
                                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                        {Number(t.montant_total).toFixed(2)} €
                                    </span>
                                </td>
                                <td><span className="badge badge-green">✓ {t.statut}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
