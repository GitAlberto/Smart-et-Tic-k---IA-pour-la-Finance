import { useState, useRef, useEffect } from 'react'
import { dataApi } from '../services/dataApi'

export default function Scanner() {
    // idle | loading | review | success
    const [state, setState] = useState('idle')
    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)

    // API State
    const [categories, setCategories] = useState([])
    const [scanResult, setScanResult] = useState({
        nom_marchand: '',
        montant_total: '',
        date_achat: '',
        categorie_id: '',
        confiance: 0,
        categorie_nom_brut: '',
        articles: []
    })

    const fileInputRef = useRef(null)

    useEffect(() => {
        dataApi.getCategories().then(setCategories).catch(console.error)
    }, [])

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return
        startScan(selectedFile)
    }

    const handleDrop = async (e) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (!droppedFile) return
        startScan(droppedFile)
    }

    const startScan = async (selectedFile) => {
        setFile(selectedFile)
        setPreviewUrl(URL.createObjectURL(selectedFile))
        setState('loading')

        try {
            const data = await dataApi.scanTicket(selectedFile)
            setScanResult({
                nom_marchand: data.nom_marchand || '',
                montant_total: data.montant_total || '',
                date_achat: data.date_achat || new Date().toISOString().split('T')[0],
                categorie_id: data.categorie_id || (categories.length > 0 ? categories[0].id : ''),
                confiance: Math.round(data.confiance || 0),
                categorie_nom_brut: data.categorie_nom_brut || '',
                articles: data.articles || []
            })
            setState('review')
        } catch (err) {
            alert(err.message)
            setState('idle')
        }
    }

    const saveTicket = async (e) => {
        if (e) e.preventDefault()
        try {
            await dataApi.createTicket({
                nom_marchand: scanResult.nom_marchand,
                montant_total: parseFloat(scanResult.montant_total),
                date_achat: scanResult.date_achat,
                categorie_id: scanResult.categorie_id || null
            })
            setState('success')
        } catch (err) {
            alert("Erreur de sauvegarde: " + err.message)
        }
    }

    const reset = () => {
        setFile(null)
        setPreviewUrl(null)
        setState('idle')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Helper for confidence bar
    const ConfBar = ({ value }) => {
        const pct = Math.round(value * 100)
        let colr = pct >= 70 ? 'var(--green)' : pct >= 40 ? '#f5c542' : 'var(--danger)'
        if (value > 1.0) value = 1.0 // cap
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colr }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {state === 'idle' && (
                <div className="scanner-drop-zone animate-in" onClick={() => fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    <div className="scanner-icon">📷</div>
                    <div className="scanner-title">Déposez votre ticket ici</div>
                    <div className="scanner-subtitle">
                        Glissez-déposez une photo de votre ticket de caisse, ou cliquez pour sélectionner un fichier.<br />
                        L'IA lira le texte, corrigera le bruit visuel (ombres), et classera chaque produit ligne par ligne.
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                        📁 Choisir un fichier <span className="bdd-tag" style={{ border: 'none', background: 'transparent' }}>IA Backend</span>
                    </button>
                </div>
            )}

            {state === 'loading' && (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px 32px' }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                        Extraction OCR & NLP en cours…
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
                        EasyOCR lit le ticket avec OpenCV (CLAHE adaptative). CamemBERT analyse chaque article...
                    </div>
                    {/* Skeletons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                        {[80, 60, 90, 70].map((w, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
                                <div className="skeleton" style={{ width: `${w}%`, height: 18, borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 28, height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', maxWidth: 400, margin: '28px auto 0' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--green), #1fa870)', borderRadius: 2, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', width: '100%' }} />
                    </div>
                </div>
            )}

            {state === 'review' && (
                <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header Résultat */}
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="result-icon glow-pulse">✅</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                                Scanner terminé
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                                {scanResult.articles.length} articles détectés
                            </div>
                        </div>
                        <button className="btn btn-ghost" onClick={reset}>↺ Nouveau Scan</button>
                    </div>

                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                        {/* Colonne de gauche : Formulaire & Image */}
                        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="card" style={{ background: '#f8fafc', padding: 12, textAlign: 'center' }}>
                                <img src={previewUrl} alt="Aperçu" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }} />
                            </div>

                            <form className="card" onSubmit={saveTicket} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Informations Générales</h3>

                                <div className="form-group">
                                    <label className="form-label">Nom du Marchand</label>
                                    <input type="text" className="form-input" value={scanResult.nom_marchand} onChange={e => setScanResult({ ...scanResult, nom_marchand: e.target.value })} required />
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Montant Total (€)</label>
                                        <input type="number" step="0.01" className="form-input" value={scanResult.montant_total} onChange={e => setScanResult({ ...scanResult, montant_total: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date d'achat</label>
                                        <input type="date" className="form-input" value={scanResult.date_achat} onChange={e => setScanResult({ ...scanResult, date_achat: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Catégorie du Ticket</label>
                                    <select className="form-input" value={scanResult.categorie_id} onChange={e => setScanResult({ ...scanResult, categorie_id: e.target.value })} required>
                                        <option value="">-- Sélectionnez une catégorie --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                                        ))}
                                    </select>
                                    {scanResult.categorie_nom_brut && (
                                        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                                            💡 L'IA recommande : {scanResult.categorie_nom_brut}
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
                                    💾 Valider ce Ticket <span className="bdd-tag" style={{ border: 'none', background: 'transparent' }}>+ DB</span>
                                </button>
                            </form>
                        </div>

                        {/* Colonne de droite : Articles détectés */}
                        <div className="card" style={{ flex: '2 1 500px' }}>
                            <div className="section-header">
                                <span className="section-title">Analyse Ligne par Ligne (NLP CamemBERT)</span>
                            </div>

                            {scanResult.articles.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                    Aucun article clairement détecté sur cette image.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Article détecté (OCR)</th>
                                                <th>Catégorie Prédite</th>
                                                <th>Confiance OCR</th>
                                                <th style={{ textAlign: 'right' }}>Prix lu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scanResult.articles.map((item, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>
                                                            {item.nom}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-gray" style={{ color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                                            {item.categorie}
                                                        </span>
                                                    </td>
                                                    <td style={{ minWidth: 100 }}>
                                                        <ConfBar value={item.confiance_ocr} />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                        {item.prix > 0 ? `${item.prix.toFixed(2)} €` : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {state === 'success' && (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px 32px' }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>
                        Ticket enregistré avec succès !
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 32 }}>
                        Les données sont synchronisées dans votre Dashboard PostgreSQL.
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <a href="/history" className="btn btn-ghost">Voir dans l'Historique</a>
                        <button className="btn btn-primary" onClick={reset}>Scanner un nouveau ticket</button>
                    </div>
                </div>
            )}
        </div>
    )
}
