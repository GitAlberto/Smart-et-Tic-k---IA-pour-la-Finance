import { Fragment, useEffect, useMemo, useState } from 'react'
import { dataApi } from '../services/dataApi'

const formatSource = (source) => {
  if (source === 'manuel') {
    return { label: 'Saisie manuelle', className: 'badge-gold' }
  }
  return { label: 'Scan OCR', className: 'badge-blue' }
}

const formatStatus = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'valide' || normalized === 'validé') {
    return { label: 'Valide', className: 'badge-green' }
  }
  if (normalized.includes('attente')) {
    return { label: 'A verifier', className: 'badge-gold' }
  }
  return { label: status || 'Inconnu', className: 'badge-gray' }
}

export default function Historique() {
  const [categoryFilter, setCategoryFilter] = useState('Toutes')
  const [sourceFilter, setSourceFilter] = useState('Toutes')
  const [sort, setSort] = useState('date')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTicketId, setExpandedTicketId] = useState(null)

  useEffect(() => {
    const fetchAllTickets = async () => {
      setLoading(true)
      try {
        const result = await dataApi.getTickets()
        setTickets(result)
      } catch (error) {
        console.error('Erreur Historique :', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllTickets()
  }, [])

  const categories = useMemo(() => {
    const names = Array.from(
      new Set(tickets.map((ticket) => ticket.categorie?.nom || 'Non categorise')),
    )
    return ['Toutes', ...names.sort((left, right) => left.localeCompare(right))]
  }, [tickets])

  const filteredTickets = useMemo(() => (
    tickets
      .filter((ticket) => (
        categoryFilter === 'Toutes'
          || (ticket.categorie?.nom || 'Non categorise') === categoryFilter
      ))
      .filter((ticket) => (
        sourceFilter === 'Toutes'
          || (ticket.source_saisie || 'scan') === sourceFilter
      ))
      .sort((left, right) => {
        if (sort === 'montant') return Number(right.montant_total) - Number(left.montant_total)
        return new Date(right.date_achat) - new Date(left.date_achat)
      })
  ), [categoryFilter, sourceFilter, sort, tickets])

  const totalAmount = filteredTickets.reduce((sum, ticket) => sum + Number(ticket.montant_total), 0)
  const manualEntries = filteredTickets.filter((ticket) => ticket.source_saisie === 'manuel').length

  const toggleTicketDetails = (ticketId) => {
    setExpandedTicketId((current) => (current === ticketId ? null : ticketId))
  }

  if (loading) return <div>Chargement de votre historique complet...</div>

  return (
    <div>
      <div className="grid-4 history-kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total tickets', value: filteredTickets.length, icon: '🧾' },
          { label: 'Montant total', value: `${totalAmount.toFixed(2)} EUR`, icon: '€' },
          { label: 'Moyenne', value: `${(totalAmount / (filteredTickets.length || 1)).toFixed(2)} EUR`, icon: '📊' },
          { label: 'Saisies manuelles', value: manualEntries, icon: '⌨️' },
        ].map((stat, index) => (
          <div key={index} className="card animate-in history-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="history-kpi-icon" style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{stat.icon}</div>
            <div>
              <div className="history-kpi-label" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stat.label}
              </div>
              <div className="history-kpi-value" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card animate-in animate-delay-1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Filtrer par categorie
            </div>
            <div className="filters-bar">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`filter-chip ${categoryFilter === category ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={`filter-chip ${sourceFilter === 'Toutes' ? 'active' : ''}`}
                onClick={() => setSourceFilter('Toutes')}
              >
                Toutes les sources
              </button>
              <button
                className={`filter-chip ${sourceFilter === 'scan' ? 'active' : ''}`}
                onClick={() => setSourceFilter('scan')}
              >
                Scan OCR
              </button>
              <button
                className={`filter-chip ${sourceFilter === 'manuel' ? 'active' : ''}`}
                onClick={() => setSourceFilter('manuel')}
              >
                Saisie manuelle
              </button>
            </div>

            <select className="filter-select" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="date">Trier par date</option>
              <option value="montant">Trier par montant</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card animate-in animate-delay-2">
        {filteredTickets.length === 0 ? (
          <div className="scanner-empty-state">
            Aucun ticket ne correspond a ces filtres pour le moment.
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="data-table history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Magasin</th>
                  <th>Date</th>
                  <th>Catégorie principale</th>
                  <th>Source</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, index) => {
                  const categoryColor = ticket.categorie?.code_couleur_hex || '#4f8ef7'
                  const categoryName = ticket.categorie?.nom || 'Non categorise'
                  const source = formatSource(ticket.source_saisie)
                  const status = formatStatus(ticket.statut)
                  const isExpanded = expandedTicketId === ticket.id

                  return (
                    <Fragment key={ticket.id}>
                      <tr
                        className={`history-ticket-row ${isExpanded ? 'open' : ''}`}
                        onClick={() => toggleTicketDetails(ticket.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleTicketDetails(ticket.id)
                          }
                        }}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        <td data-label="#" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          <span className="history-row-toggle">
                            <span className="history-row-chevron">{isExpanded ? '▾' : '▸'}</span>
                            #{index + 1}
                          </span>
                        </td>
                        <td data-label="Magasin">
                          <div className="history-merchant-cell">
                            <span className="history-merchant-name">{ticket.nom_marchand}</span>
                            {ticket.est_exceptionnel && (
                              <span className="badge badge-gold">Achat exceptionnel</span>
                            )}
                            {ticket.texte_brut_extrait && (
                              <span className="badge badge-gray">Note dispo</span>
                            )}
                          </div>
                        </td>
                        <td data-label="Date" style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                          {new Date(ticket.date_achat).toLocaleDateString('fr-FR')}
                        </td>
                        <td data-label="Catégorie principale">
                          <span className="badge" style={{ background: `${categoryColor}20`, color: categoryColor }}>
                            {categoryName}
                          </span>
                        </td>
                        <td data-label="Source">
                          <span className={`badge ${source.className}`}>{source.label}</span>
                        </td>
                        <td data-label="Montant">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                            {Number(ticket.montant_total).toFixed(2)} EUR
                          </span>
                        </td>
                        <td data-label="Statut">
                          <span className={`badge ${status.className}`}>{status.label}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="history-details-row">
                          <td colSpan={7}>
                            <div className="history-details-panel">
                              <div className="history-details-title">Articles du ticket</div>
                              {ticket.articles?.length ? (
                                <div className="history-articles-list">
                                  {ticket.articles.map((article) => {
                                    const articleCategoryColor = article.categorie?.code_couleur_hex || '#64748b'
                                    const articleCategoryName = article.categorie?.nom || 'Non categorise'
                                    const lineTotal = Number(article.prix || 0) * Number(article.quantite || 0)

                                    return (
                                      <div key={article.id} className="history-article-row">
                                        <div className="history-article-name">{article.nom}</div>
                                        <div className="history-article-category">
                                          <span className="badge" style={{ background: `${articleCategoryColor}20`, color: articleCategoryColor }}>
                                            {articleCategoryName}
                                          </span>
                                        </div>
                                        <div className="history-article-amount">{lineTotal.toFixed(2)} EUR</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="history-details-empty">
                                  Aucun article detaille pour ce ticket.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
