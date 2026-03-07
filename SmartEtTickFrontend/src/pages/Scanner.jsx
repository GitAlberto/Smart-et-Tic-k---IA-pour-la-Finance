import { useState } from 'react'

const MOCK_RESULT = [
    { name: 'SHAMPOING ELSÈVE LISSE', cat: 'Hygiène_et_Beauté', price: 4.99, conf: 0.94 },
    { name: 'COCA COLA 1.5L PET', cat: 'Boissons', price: 1.89, conf: 0.97 },
    { name: 'LESSIVE ARIEL LIQUIDE', cat: 'Entretien', price: 8.30, conf: 0.88 },
    { name: 'KINDER BUENO', cat: 'Alimentation', price: 1.35, conf: 0.99 },
    { name: 'ESSUIE TOUT BOUNTY', cat: 'Entretien', price: 3.20, conf: 0.82 },
    { name: '5OCL BIERE 3 MONTS', cat: 'Boissons', price: 2.10, conf: 0.76 },
    { name: 'POULET ROTI JANZE', cat: 'Restauration', price: 12.90, conf: 0.71 },
]

const CAT_COLORS = {
    Alimentation: '#38d39f',
    Boissons: '#3ac8d9',
    Entretien: '#9b8af7',
    Hygiène_et_Beauté: '#4f8ef7',
    Restauration: '#f5c542',
    Divers_Bazar: '#f05252',
}

function ConfBar({ value, color }) {
    const pct = Math.round(value * 100)
    const colr = pct >= 85 ? '#38d39f' : pct >= 65 ? '#f5c542' : '#f05252'
    return (
        <div className="confidence-bar-wrapper">
            <div className="confidence-bar-track">
                <div
                    className="confidence-bar-fill"
                    style={{ width: `${pct}%`, background: colr }}
                />
            </div>
            <span className="confidence-label">{pct}%</span>
        </div>
    )
}

export default function Scanner() {
    const [state, setState] = useState('idle') // idle | loading | done

    const simulate = () => {
        setState('loading')
        setTimeout(() => setState('done'), 2200)
    }

    const total = MOCK_RESULT.reduce((s, i) => s + i.price, 0)

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* ── Drop Zone ── */}
            {state === 'idle' && (
                <div className="scanner-drop-zone animate-in" onClick={simulate}>
                    <div className="scanner-icon">📷</div>
                    <div className="scanner-title">Déposez votre ticket ici</div>
                    <div className="scanner-subtitle">
                        Glissez-déposez une photo de votre ticket de caisse, ou cliquez pour sélectionner un fichier.
                        L'IA CamemBERT analysera chaque article automatiquement.
                    </div>
                    <div className="scanner-formats">
                        <span className="badge badge-gray">JPG</span>
                        <span className="badge badge-gray">PNG</span>
                        <span className="badge badge-gray">PDF</span>
                        <span className="badge badge-gray">HEIC</span>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={simulate}>
                        📁 Choisir un fichier
                    </button>
                </div>
            )}

            {/* ── Loading ── */}
            {state === 'loading' && (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px 32px' }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                        Analyse en cours…
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
                        CamemBERT lit et classe chaque article de votre ticket
                    </div>

                    {/* Skeleton lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                        {[80, 60, 90, 70, 55].map((w, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
                                <div className="skeleton" style={{ width: `${w}%`, height: 18, borderRadius: 4 }} />
                                <div className="skeleton" style={{ width: 60, height: 18, borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 28, height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--green), #1fa870)',
                                borderRadius: 2,
                                animation: 'shimmer 1.5s infinite',
                                backgroundSize: '200% 100%',
                                width: '100%',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Results ── */}
            {state === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header résultat */}
                    <div className="card animate-in" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="result-icon glow-pulse">✅</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                                Ticket analysé avec succès
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                                {MOCK_RESULT.length} articles détectés · Carrefour Market · 07 mars 2026
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
                                {total.toFixed(2)} €
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total</div>
                        </div>
                        <button className="btn btn-ghost" onClick={() => setState('idle')}>
                            ↺ Nouveau
                        </button>
                    </div>

                    {/* Liste des articles */}
                    <div className="card animate-in animate-delay-1">
                        <div className="section-header">
                            <span className="section-title">Détail des articles <span className="bdd-tag">bdd</span></span>
                            <span className="badge badge-green">IA CamemBERT <span className="bdd-tag" style={{ border: 'none', background: 'transparent', padding: 0 }}>api</span></span>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Article détecté (OCR)</th>
                                    <th>Catégorie IA</th>
                                    <th>Confiance</th>
                                    <th style={{ textAlign: 'right' }}>Prix</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_RESULT.map((item, i) => {
                                    const color = CAT_COLORS[item.cat.replace('/', '_')] || CAT_COLORS[item.cat] || '#4f8ef7'
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: color + '20', color }}>
                                                    {item.cat}
                                                </span>
                                            </td>
                                            <td style={{ minWidth: 140 }}>
                                                <ConfBar value={item.conf} />
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                                {item.price.toFixed(2)} €
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost">📥 Exporter CSV</button>
                        <button className="btn btn-primary">💾 Sauvegarder le ticket</button>
                    </div>
                </div>
            )}
        </div>
    )
}
