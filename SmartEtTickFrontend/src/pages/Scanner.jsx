import { useEffect, useMemo, useRef, useState } from 'react'
import { dataApi } from '../services/dataApi'

const getToday = () => new Date().toISOString().split('T')[0]

const createManualProduct = (defaultCategoryId = '') => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  nom: '',
  prix: '',
  quantite: '1',
  categorie_id: defaultCategoryId,
})

const buildManualForm = (defaultCategoryId = '') => ({
  nom_marchand: '',
  date_achat: getToday(),
  commentaire: '',
  est_exceptionnel: false,
  articles: [createManualProduct(defaultCategoryId)],
})

const buildScanResult = (defaultCategoryId = '') => ({
  nom_marchand: '',
  montant_total: '',
  date_achat: getToday(),
  categorie_id: defaultCategoryId,
  confiance: 0,
  categorie_nom_brut: '',
  est_exceptionnel: false,
  articles: [],
})

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getLineTotal = (article) => parseAmount(article.prix) * parseAmount(article.quantite || 1)

function ModeCard({ active, title, subtitle, tag, onClick }) {
  return (
    <button
      type="button"
      className={`capture-mode-card ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <span className={`badge ${active ? 'badge-green' : 'badge-gray'}`}>{tag}</span>
      </div>
      <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
        {subtitle}
      </div>
    </button>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  let color = 'var(--red)'
  if (pct >= 70) color = 'var(--green)'
  else if (pct >= 40) color = 'var(--gold)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 38 }}>{pct}%</span>
    </div>
  )
}

function ExceptionalPurchaseField({ checked, onChange }) {
  return (
    <div className="ticket-flag-row">
      <label className="ticket-flag-checkbox">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>Achat exceptionnel</span>
      </label>
      <div className="ticket-flag-help">
        Exclu de la projection de fin de mois pour eviter de fausser la tendance courante.
      </div>
    </div>
  )
}

function ScanTicketForm({ form, categories, onFieldChange, onSubmit }) {
  return (
    <form className="card" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16 }}>Verifier les informations</h3>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
          Corrigez le marchand, la date ou la categorie avant sauvegarde.
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nom du marchand</label>
        <input
          type="text"
          className="form-input"
          value={form.nom_marchand}
          onChange={(event) => onFieldChange('nom_marchand', event.target.value)}
          required
        />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Montant total (EUR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={form.montant_total}
            onChange={(event) => onFieldChange('montant_total', event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date d'achat</label>
          <input
            type="date"
            className="form-input"
            value={form.date_achat}
            onChange={(event) => onFieldChange('date_achat', event.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Categorie principale</label>
        <select
          className="form-input"
          value={form.categorie_id}
          onChange={(event) => onFieldChange('categorie_id', event.target.value)}
          required={categories.length > 0}
        >
          <option value="">-- Selectionnez une categorie --</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icone ? `${category.icone} ` : ''}{category.nom}
            </option>
          ))}
        </select>
        {form.categorie_nom_brut && (
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
            Suggestion IA: {form.categorie_nom_brut}
          </div>
        )}
      </div>

      <ExceptionalPurchaseField
        checked={Boolean(form.est_exceptionnel)}
        onChange={(checked) => onFieldChange('est_exceptionnel', checked)}
      />

      <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
        Valider le ticket scanne
      </button>
    </form>
  )
}

export default function Scanner() {
  const [entryMode, setEntryMode] = useState('scan')
  const [state, setState] = useState('idle')
  const [categories, setCategories] = useState([])
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [lastSavedMode, setLastSavedMode] = useState(null)
  const [scanResult, setScanResult] = useState(buildScanResult())
  const [manualForm, setManualForm] = useState(buildManualForm())

  const fileInputRef = useRef(null)

  const defaultCategoryId = categories[0]?.id || ''

  useEffect(() => {
    dataApi.getCategories().then(setCategories).catch(console.error)
  }, [])

  useEffect(() => {
    if (!defaultCategoryId) return

    setScanResult((current) => (
      current.categorie_id ? current : { ...current, categorie_id: defaultCategoryId }
    ))

    setManualForm((current) => ({
      ...current,
      articles: current.articles.map((article) => (
        article.categorie_id ? article : { ...article, categorie_id: defaultCategoryId }
      )),
    }))
  }, [defaultCategoryId])

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const manualTotal = useMemo(
    () => manualForm.articles.reduce((sum, article) => sum + getLineTotal(article), 0),
    [manualForm.articles],
  )

  const dominantCategory = useMemo(() => {
    const amountByCategory = new Map()

    manualForm.articles.forEach((article) => {
      if (!article.categorie_id) return
      amountByCategory.set(
        article.categorie_id,
        (amountByCategory.get(article.categorie_id) || 0) + getLineTotal(article),
      )
    })

    if (amountByCategory.size === 0) return null

    const [categoryId] = [...amountByCategory.entries()].sort((left, right) => right[1] - left[1])[0]
    return categories.find((category) => category.id === categoryId) || null
  }, [categories, manualForm.articles])

  const updateScanField = (field, value) => {
    setScanResult((current) => ({ ...current, [field]: value }))
  }

  const updateManualField = (field, value) => {
    setManualForm((current) => ({ ...current, [field]: value }))
  }

  const updateManualArticle = (articleId, field, value) => {
    setManualForm((current) => ({
      ...current,
      articles: current.articles.map((article) => (
        article.id === articleId ? { ...article, [field]: value } : article
      )),
    }))
  }

  const addManualArticle = () => {
    setManualForm((current) => ({
      ...current,
      articles: [...current.articles, createManualProduct(defaultCategoryId)],
    }))
  }

  const removeManualArticle = (articleId) => {
    setManualForm((current) => {
      if (current.articles.length === 1) return current
      return {
        ...current,
        articles: current.articles.filter((article) => article.id !== articleId),
      }
    })
  }

  const switchMode = (mode) => {
    setEntryMode(mode)
    setState(mode === 'scan' ? 'idle' : 'manual')
    setLastSavedMode(null)
  }

  const resetScan = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setScanResult(buildScanResult(defaultCategoryId))
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetManual = () => {
    setManualForm(buildManualForm(defaultCategoryId))
    setState('manual')
  }

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    startScan(selectedFile)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return
    startScan(droppedFile)
  }

  const startScan = async (selectedFile) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    setState('loading')
    setLastSavedMode(null)

    try {
      const data = await dataApi.scanTicket(selectedFile)
      setScanResult({
        nom_marchand: data.nom_marchand || '',
        montant_total: data.montant_total || '',
        date_achat: data.date_achat || getToday(),
        categorie_id: data.categorie_id || defaultCategoryId,
        confiance: Math.round(Number(data.confiance || 0)),
        categorie_nom_brut: data.categorie_nom_brut || '',
        est_exceptionnel: false,
        articles: data.articles || [],
      })
      setState('review')
    } catch (error) {
      alert(error.message)
      setState('idle')
    }
  }

  const saveScannedTicket = async (event) => {
    event.preventDefault()

    const articles = scanResult.articles
      .filter((article) => article.nom?.trim())
      .filter((article) => Number(article.prix) > 0)
      .map((article) => ({
        nom: article.nom.trim(),
        prix: Number(article.prix),
        quantite: 1,
        categorie_id: article.categorie_id || null,
      }))

    try {
      await dataApi.createTicket({
        nom_marchand: scanResult.nom_marchand.trim(),
        montant_total: Number.parseFloat(scanResult.montant_total),
        date_achat: scanResult.date_achat,
        categorie_id: scanResult.categorie_id || null,
        est_exceptionnel: Boolean(scanResult.est_exceptionnel),
        source_saisie: 'scan',
        confiance_ocr: scanResult.confiance,
        articles,
      })
      setLastSavedMode('scan')
      setState('success')
    } catch (error) {
      alert(`Erreur de sauvegarde: ${error.message}`)
    }
  }

  const saveManualTicket = async (event) => {
    event.preventDefault()

    const articles = manualForm.articles.map((article) => ({
      nom: article.nom.trim(),
      prix: parseAmount(article.prix),
      quantite: parseAmount(article.quantite || 1),
      categorie_id: article.categorie_id || null,
    }))

    try {
      await dataApi.createTicket({
        nom_marchand: manualForm.nom_marchand.trim(),
        montant_total: Number(manualTotal.toFixed(2)),
        date_achat: manualForm.date_achat,
        categorie_id: dominantCategory?.id || null,
        est_exceptionnel: Boolean(manualForm.est_exceptionnel),
        source_saisie: 'manuel',
        texte_brut_extrait: manualForm.commentaire.trim() || null,
        articles,
      })
      setLastSavedMode('manuel')
      setState('success')
    } catch (error) {
      alert(`Erreur de sauvegarde: ${error.message}`)
    }
  }

  const renderSuccess = () => {
    const savedFromManual = lastSavedMode === 'manuel'

    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: '56px 32px' }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>OK</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>
          Ticket enregistre
        </div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 28 }}>
          {savedFromManual
            ? `Le ticket manuel et ses ${manualForm.articles.length} produit(s) ont ete ajoutes a l'historique.`
            : "Le ticket scanne a ete valide et ajoute a votre historique."}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (savedFromManual) resetManual()
              else resetScan()
            }}
          >
            {savedFromManual ? 'Ajouter un autre ticket manuel' : 'Scanner un autre ticket'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (savedFromManual) {
                resetScan()
                switchMode('scan')
              } else {
                resetManual()
                switchMode('manual')
              }
            }}
          >
            {savedFromManual ? 'Passer au scan' : 'Saisir un ticket manuel'}
          </button>
        </div>
      </div>
    )
  }

  const renderScan = () => {
    if (state === 'loading') {
      return (
        <div className="card animate-in" style={{ textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: 46, marginBottom: 18 }}>IA</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Analyse OCR en cours
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 30 }}>
            Le ticket est nettoye, lu puis converti en donnees exploitables.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
            {[78, 56, 88, 64].map((width, index) => (
              <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: `${width}%`, height: 18, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (state === 'review') {
      return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="result-icon glow-pulse">IA</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                Resultat du scan
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
                {scanResult.articles.length} lignes detectees sur {file?.name || 'votre image'}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={resetScan}>
              Refaire un scan
            </button>
          </div>

          <div className="scanner-review-layout">
            <div className="scanner-side-column">
              <div className="card" style={{ background: '#f8fafc', padding: 12, textAlign: 'center' }}>
                <img
                  src={previewUrl}
                  alt="Apercu du ticket"
                  style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8 }}
                />
              </div>

              <ScanTicketForm
                form={scanResult}
                categories={categories}
                onFieldChange={updateScanField}
                onSubmit={saveScannedTicket}
              />
            </div>

            <div className="card scanner-main-column">
              <div className="section-header">
                <span className="section-title">Lecture ligne par ligne</span>
                <span className="badge badge-blue">OCR</span>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Confiance globale du scan
                </div>
                <ConfidenceBar value={scanResult.confiance} />
              </div>

              {scanResult.articles.length === 0 ? (
                <div className="scanner-empty-state">
                  Aucun article n'a ete clairement detecte. Vous pouvez quand meme enregistrer le ticket corrige.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Article detecte</th>
                        <th>Categorie predite</th>
                        <th>Confiance</th>
                        <th style={{ textAlign: 'right' }}>Prix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.articles.map((item, index) => (
                        <tr key={`${item.nom}-${index}`}>
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
                          <td style={{ minWidth: 110 }}>
                            <ConfidenceBar value={(item.confiance_ocr || 0) * 100} />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {item.prix > 0 ? `${Number(item.prix).toFixed(2)} EUR` : '-'}
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
      )
    }

    return (
      <div className="manual-helper-grid animate-in">
        <div
          className="scanner-drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="scanner-icon">OCR</div>
          <div className="scanner-title">Deposez votre ticket ici</div>
          <div className="scanner-subtitle">
            Glissez une photo ou ouvrez un fichier pour extraire automatiquement le marchand,
            la date, le montant et une categorie recommandee.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={(event) => {
              event.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            Choisir une image
          </button>
        </div>

        <div className="card">
          <div className="section-header">
            <span className="section-title">Quand utiliser le scan</span>
            <span className="badge badge-green">Rapide</span>
          </div>
          <div className="scanner-check-list">
            <div className="scanner-check-item">Capture quasi immediate si vous avez encore le ticket.</div>
            <div className="scanner-check-item">Suggestion automatique de categorie pour aller plus vite.</div>
            <div className="scanner-check-item">Detection des lignes produits quand l'image est assez nette.</div>
            <div className="scanner-check-item">Relecture recommandee si le ticket est froisse, sombre ou coupe.</div>
          </div>
        </div>
      </div>
    )
  }

  const renderManualEntry = () => (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="scanner-review-layout">
        <div className="scanner-side-column">
          <form id="manual-ticket-form" className="card" onSubmit={saveManualTicket} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ajouter un ticket manuel</h3>
              <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                Un seul marchand, plusieurs produits. Le total du ticket est calcule depuis les lignes a droite.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nom du marchand</label>
              <input
                type="text"
                className="form-input"
                value={manualForm.nom_marchand}
                onChange={(event) => updateManualField('nom_marchand', event.target.value)}
                placeholder="Ex: Carrefour, Leclerc, Biocoop"
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date d'achat</label>
                <input
                  type="date"
                  className="form-input"
                  value={manualForm.date_achat}
                  onChange={(event) => updateManualField('date_achat', event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Montant du ticket</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${manualTotal.toFixed(2)} EUR`}
                  readOnly
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contexte libre</label>
              <textarea
                className="form-input"
                rows="4"
                value={manualForm.commentaire}
                onChange={(event) => updateManualField('commentaire', event.target.value)}
                placeholder="Ex: Ticket perdu, achat reconstruit depuis le compte bancaire."
                style={{ resize: 'vertical', minHeight: 110 }}
              />
            </div>

            <ExceptionalPurchaseField
              checked={Boolean(manualForm.est_exceptionnel)}
              onChange={(checked) => updateManualField('est_exceptionnel', checked)}
            />

            <div className="manual-ticket-summary">
              <div className="manual-ticket-summary-card">
                <div className="manual-ticket-summary-label">Produits saisis</div>
                <div className="manual-ticket-summary-value">{manualForm.articles.length}</div>
              </div>
              <div className="manual-ticket-summary-card">
                <div className="manual-ticket-summary-label">Categorie dominante</div>
                <div className="manual-ticket-summary-value" style={{ fontSize: 16 }}>
                  {dominantCategory ? `${dominantCategory.icone ? `${dominantCategory.icone} ` : ''}${dominantCategory.nom}` : 'A definir'}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="card scanner-main-column">
          <div className="section-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="section-title">Produits du ticket</span>
              <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                Chaque nouveau produit s'ajoute sur la ligne suivante, dans une liste compacte.
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={addManualArticle}>
              + Ajouter un produit
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div className="manual-products-table">
              <div className="manual-products-head">
                <div>#</div>
                <div>Produit</div>
                <div>Qté</div>
                <div>Prix</div>
                <div>Categorie</div>
                <div>Total</div>
                <div />
              </div>

              <div className="manual-products-list">
                {manualForm.articles.map((article, index) => (
                  <div key={article.id} className="manual-product-row">
                    <div className="manual-product-index">{index + 1}</div>

                    <input
                      type="text"
                      className="form-input"
                      value={article.nom}
                      onChange={(event) => updateManualArticle(article.id, 'nom', event.target.value)}
                      placeholder="Nom du produit"
                      aria-label={`Nom du produit ${index + 1}`}
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      value={article.quantite}
                      onChange={(event) => updateManualArticle(article.id, 'quantite', event.target.value)}
                      placeholder="1"
                      aria-label={`Quantite du produit ${index + 1}`}
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={article.prix}
                      onChange={(event) => updateManualArticle(article.id, 'prix', event.target.value)}
                      placeholder="0.00"
                      aria-label={`Prix du produit ${index + 1}`}
                    />

                    <select
                      className="form-input"
                      value={article.categorie_id}
                      onChange={(event) => updateManualArticle(article.id, 'categorie_id', event.target.value)}
                      aria-label={`Categorie du produit ${index + 1}`}
                    >
                      <option value="">-- Selectionnez --</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icone ? `${category.icone} ` : ''}{category.nom}
                        </option>
                      ))}
                    </select>

                    <div className="manual-product-total">
                      {getLineTotal(article).toFixed(2)} EUR
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeManualArticle(article.id)}
                      disabled={manualForm.articles.length === 1}
                      style={{ opacity: manualForm.articles.length === 1 ? 0.5 : 1, justifyContent: 'center' }}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="manual-products-actions">
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {manualForm.articles.length} produit(s) · total {manualTotal.toFixed(2)} EUR
            </div>
            <button type="submit" form="manual-ticket-form" className="btn btn-primary">
              Enregistrer le ticket manuel
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span className="section-title">Pourquoi ce mode est utile</span>
          <span className="badge badge-gold">Multi-produits</span>
        </div>
        <div className="scanner-check-list scanner-check-list-horizontal">
          <div className="scanner-check-item">Vous reconstituez un ticket complet meme si le papier a disparu.</div>
          <div className="scanner-check-item">Chaque produit peut etre range dans sa propre categorie.</div>
          <div className="scanner-check-item">La repartition analytique devient plus fidele a la vraie depense.</div>
          <div className="scanner-check-item">Le marchand reste unique, ce qui conserve la logique d'un vrai ticket.</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div className="card animate-in">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <span className="section-title">Ajouter un ticket</span>
          <span className="badge badge-blue">2 parcours</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Choisissez entre un scan OCR classique ou une saisie manuelle detaillee avec plusieurs produits.
        </div>

        <div className="capture-mode-grid">
          <ModeCard
            active={entryMode === 'scan'}
            title="Scanner le ticket"
            subtitle="Importer une image, laisser l'IA pre-remplir le formulaire puis verifier."
            tag="OCR"
            onClick={() => switchMode('scan')}
          />
          <ModeCard
            active={entryMode === 'manual'}
            title="Saisie manuelle"
            subtitle="Un marchand, plusieurs produits, categorie par ligne et total automatique."
            tag="Manual"
            onClick={() => switchMode('manual')}
          />
        </div>
      </div>

      {state === 'success' ? renderSuccess() : entryMode === 'scan' ? renderScan() : renderManualEntry()}
    </div>
  )
}
