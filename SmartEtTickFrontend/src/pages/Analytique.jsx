import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { dataApi } from '../services/dataApi'

// Mini sparkline SVG inline
function Sparkline({ values, color }) {
    const max = Math.max(...values.filter(Boolean), 1)
    const W = 80, H = 30
    const pts = values
        .map((v, i) => [
            (i / (values.length - 1)) * W,
            H - (v / max) * H * 0.85,
        ])
        .map(([x, y]) => `${x},${y}`)
        .join(' ')
    return (
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
            />
        </svg>
    )
}

export default function Analytique() {
    const { period } = useApp()

    const [data, setData] = useState({
        categories: [],
        monthly_totals: {},
        total_depenses: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true)
            try {
                const result = await dataApi.getAnalytics(period)
                setData(result)
            } catch (err) {
                console.error("Erreur de chargement des analytics", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, [period])

    if (loading) return <div>Génération de vos analyses...</div>

    return (
        <div>
            {/* ── Vue globale ── */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Répartition par catégorie */}
                <div className="card animate-in">
                    <div className="section-header">
                        <span className="section-title">Répartition par catégorie <span className="bdd-tag">api</span></span>
                        <span className="badge badge-gold">Ce mois</span>
                    </div>

                    <div className="analytics-category-list" style={{ display: 'flex', flexDirection: 'column' }}>
                        {data.categories.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Aucune donnée sur cette période.</div>}
                        {data.categories.map((c) => (
                            <div key={c.name} className="category-bar">
                                <div className="category-color-dot" style={{ background: c.color }} />
                                <div className="category-info">
                                    <div className="category-name">{c.icon} {c.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.tickets} tickets</div>
                                </div>
                                <div className="category-progress-track">
                                    <div
                                        className="category-progress-fill"
                                        style={{ width: `${c.pct}%`, background: c.color }}
                                    />
                                </div>
                                <div className="category-amount">{c.amount.toFixed(2)} €</div>
                            </div>
                        ))}
                    </div>

                    <div className="divider" />
                    <div className="analytics-total-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total de la période</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>
                            {data.total_depenses.toFixed(2)} € <span className="bdd-tag">api</span>
                        </span>
                    </div>
                </div>

                {/* Évolution mensuelle */}
                <div className="card animate-in animate-delay-1">
                    <div className="section-header">
                        <span className="section-title">Évolution mensuelle</span>
                        <span className="badge badge-blue">2026</span>
                    </div>

                    {/* Grand chiffre */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Cumul sur la période ({period} mois)
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                            {data.total_depenses.toFixed(2)} <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>€</span> <span className="bdd-tag" style={{ verticalAlign: 'middle', marginBottom: 6 }}>api</span>
                        </div>
                    <div className="analytics-trend-row" style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <span className="trend-down">▼ 6.2%</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>vs même période l'année dernière</span>
                        </div>
                    </div>

                    {/* Barres par mois (horizontales) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(data.monthly_totals).length === 0 && <div style={{ color: 'var(--text-muted)' }}>Génération en cours...</div>}
                        {Object.entries(data.monthly_totals).map(([m, v]) => {
                            const max = Math.max(...Object.values(data.monthly_totals), 1)
                            const pct = v ? (v / max) * 100 : 0
                            const dateLabel = new Date(m + "-01").toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                            return (
                                <div key={m} className="analytics-month-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div className="analytics-month-label" style={{ width: 60, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{dateLabel}</div>
                                    <div style={{ flex: 1, height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            background: v ? 'linear-gradient(90deg, #38d39f, #1fa870)' : 'transparent',
                                            borderRadius: 4,
                                            transition: 'width 1s ease',
                                        }} />
                                    </div>
                                    <div className="analytics-month-amount" style={{
                                        width: 80,
                                        textAlign: 'right',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color: v ? 'var(--text-primary)' : 'var(--text-muted)',
                                    }}>
                                        {v ? `${v.toLocaleString('fr')} €` : '—'}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Cards par catégorie ── */}
            <div className="section-header" style={{ marginBottom: 16 }}>
                <span className="section-title">Détail par catégorie</span>
                <span className="badge badge-gray">Ce mois</span>
            </div>

            <div className="grid-3">
                {data.categories.length === 0 && <div>Aucune donnée sur cette période.</div>}
                {data.categories.map((c, i) => (
                    <div
                        key={c.name}
                        className={`card animate-in animate-delay-${(i % 4) + 1}`}
                        style={{
                            borderColor: `${c.color}25`,
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Accent top */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                            background: `linear-gradient(90deg, ${c.color}, transparent)`,
                        }} />

                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{c.name}</div>
                            </div>
                            <Sparkline
                                values={[0, c.amount * 0.4, c.amount * 0.6, c.amount * 0.8, c.amount]}
                                color={c.color}
                            />
                        </div>

                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                            {c.amount.toFixed(2)} €
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ height: 4, flex: 1, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', marginRight: 10 }}>
                                <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: c.color, fontWeight: 700 }}>{c.pct}%</span>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                            {c.tickets} tickets · moy. {(c.amount / (c.tickets || 1)).toFixed(2)} €/ticket
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
