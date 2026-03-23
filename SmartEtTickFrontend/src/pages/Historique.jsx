import { useEffect, useMemo, useState } from 'react'
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

  if (loading) return <div>Chargement de votre historique complet...</div>

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total tickets', value: filteredTickets.length, icon: 'DB' },
          { label: 'Montant total', value: `${totalAmount.toFixed(2)} EUR`, icon: 'EUR' },
          { label: 'Moyenne', value: `${(totalAmount / (filteredTickets.length || 1)).toFixed(2)} EUR`, icon: 'AVG' },
          { label: 'Saisies manuelles', value: manualEntries, icon: 'MAN' },
        ].map((stat, index) => (
          <div key={index} className="card animate-in" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 2 }}>
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
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Magasin</th>
                  <th>Date</th>
                  <th>Categorie</th>
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

                  return (
                    <tr key={ticket.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ticket.nom_marchand}</div>
                        {ticket.est_exceptionnel && (
                          <div style={{ marginTop: 6 }}>
                            <span className="badge badge-gold">Achat exceptionnel</span>
                          </div>
                        )}
                        {ticket.texte_brut_extrait && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
                            Note disponible
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                        {new Date(ticket.date_achat).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${categoryColor}20`, color: categoryColor }}>
                          {categoryName}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${source.className}`}>{source.label}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                          {Number(ticket.montant_total).toFixed(2)} EUR
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${status.className}`}>{status.label}</span>
                      </td>
                    </tr>
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
