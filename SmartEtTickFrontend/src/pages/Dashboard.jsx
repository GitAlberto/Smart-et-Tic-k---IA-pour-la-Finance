import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { dataApi } from '../services/dataApi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts'

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

function ExpensesChart({ monthlyTotals, budget }) {
    if (!monthlyTotals) return <div style={{ minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>

    // Convert object { "2026-02": 1500 } to array of { month: "02", depense: 1500 }
    const data = Object.entries(monthlyTotals).map(([m, v]) => ({
        month: m.split('-')[1],
        depense: v
    }))

    if (data.length === 0) return <div style={{ minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Pas de données suffisantes.</div>

    return (
        <div className="chart-container" style={{ minHeight: '260px', width: '100%', padding: '10px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-accent)" opacity={0.5} />
                    <XAxis
                        dataKey="month"
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }}
                        contentStyle={{
                            backgroundColor: 'var(--bg-popover)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                        }}
                        itemStyle={{ color: 'var(--red)' }}
                        formatter={(value) => [`${value} €`, 'Dépenses']}
                        labelFormatter={(label) => `Mois : ${label}`}
                    />

                    {/* Fixed Budget Reference Line */}
                    {budget > 0 && (
                        <ReferenceLine
                            y={budget}
                            stroke="var(--gold)"
                            strokeDasharray="4 4"
                            label={{
                                position: 'insideTopLeft',
                                value: 'Objectif',
                                fill: 'var(--gold)',
                                fontSize: 11,
                                dy: -10
                            }}
                        />
                    )}

                    {/* Rounded Bars matching the design system */}
                    <Bar
                        dataKey="depense"
                        fill="var(--red)"
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Mini donut SVG
function DonutChart({ categories, totalDepenses }) {
    if (!categories || categories.length === 0) return <div style={{ minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Pas de données de catégories</div>

    // Garder seulement le top 5
    const topCats = categories.slice(0, 5)

    // Calculer un Custom Label personnalisé pour le centre du Donut
    const renderCenterLabel = () => {
        return (
            <>
                <text x="50%" y="45%" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700" fontFamily="Space Grotesk">
                    {Number(totalDepenses).toFixed(0)}€
                </text>
                <text x="50%" y="58%" textAnchor="middle" fill="var(--text-muted)" fontSize="12">
                    période
                </text>
            </>
        )
    }

    return (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', minHeight: '260px', padding: '10px 0' }}>
            <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={topCats}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="pct"   // Use the percentage value to size the slices
                            stroke="none"
                            cornerRadius={4}
                        >
                            {topCats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#4f8ef7'} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-popover)',
                                border: '1px solid var(--border-accent)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)', fontWeight: '600' }}
                            formatter={(value, name, props) => [`${value}% (${Number((value / 100) * totalDepenses).toFixed(0)}€)`, props.payload.name]}
                        />
                        {/* Custom SVG elements can be layered inside Recharts via regular SVG tags */}
                        {renderCenterLabel()}
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="donut-legend" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topCats.map((d) => (
                    <div key={d.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="legend-dot" style={{ background: d.color || '#4f8ef7', width: '10px', height: '10px', borderRadius: '50%' }} />
                            <div className="legend-label" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{d.name}</div>
                        </div>
                        <div className="legend-value" style={{ fontWeight: '600', fontFamily: 'var(--font-display)' }}>{d.pct}%</div>
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
        categories_actives: 0,
        budget_fixe: 0,
        budget_restant: 0,
        pct_budget_restant: 0,
        projection_fin_mois: 0,
        pct_marge_projection: 0,
        pct_depassement: 0,
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
                <KpiCard
                    label={<>Dépenses ({period}m) <span className="bdd-tag">api</span></>}
                    value={`${Number(stats.total_depenses).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                    icon="📉"
                    trend={stats.trend_depenses}
                    trendLabel="vs prcd."
                    accentColor="var(--red)"
                    delay={1}
                />
                <KpiCard
                    label={<>Budget restant ({period}m) <span className="bdd-tag">api</span></>}
                    value={`${Number(stats.budget_restant).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
                    icon="💰"
                    trend={stats.budget_restant >= 0 ? stats.pct_budget_restant : -(stats.pct_depassement)}
                    trendLabel={stats.budget_restant >= 0 ? "du budget dispo." : "de dépassement"}
                    accentColor={stats.budget_restant >= 0 ? "var(--green)" : "var(--red)"}
                    delay={2}
                />
                <KpiCard
                    label={<>Projection fin du mois actuel <span className="bdd-tag">api</span></>}
                    value={`${Number(stats.projection_fin_mois).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
                    icon="📆"
                    trend={stats.pct_marge_projection}
                    trendLabel={stats.pct_marge_projection >= 0 ? "de marge proj." : "de dépassement proj."}
                    accentColor={stats.pct_marge_projection >= 0 ? "var(--gold)" : "var(--danger)"}
                    delay={3}
                />
                <KpiCard
                    label={<>Catégories actives <span className="bdd-tag">api</span></>}
                    value={stats.categories_actives}
                    icon="◑"
                    trend={stats.trend_categories}
                    trendLabel="vs prcd."
                    accentColor="var(--blue)"
                    delay={4}
                />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card animate-in animate-delay-1">
                    <div className="section-header">
                        <span className="section-title">Dépenses vs Budget <span className="bdd-tag">api</span></span>
                        <span className="badge badge-green">{period} mois</span>
                    </div>
                    {analytics && <ExpensesChart monthlyTotals={analytics.monthly_totals} budget={stats.budget_fixe} />}
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
