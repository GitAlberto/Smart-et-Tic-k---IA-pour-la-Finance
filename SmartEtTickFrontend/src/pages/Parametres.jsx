import { useApp } from '../AppContext'

export default function Parametres() {
    const { theme, toggleTheme, period, setPeriod } = useApp()

    return (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

            {/* ── Préférences d'affichage ── */}
            <div className="card animate-in">
                <div className="settings-section-title">Apparence & Affichage</div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label">Thème de l'application</div>
                        <div className="settings-row-desc">Basculer entre le mode clair et sombre</div>
                    </div>
                    <div className="settings-row-control">
                        <button className="theme-toggle" onClick={toggleTheme} style={{ width: 140, marginBottom: 0 }}>
                            {theme === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
                            <div className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label">Période d'analyse par défaut <span className="bdd-tag">bdd/api</span></div>
                        <div className="settings-row-desc">
                            Données affichées sur le Dashboard et Analytique
                        </div>
                    </div>
                    <div className="settings-row-control">
                        <div className="segment-control">
                            {[1, 2, 3, 6].map(m => (
                                <button
                                    key={m}
                                    className={`segment-btn ${period === m ? 'active' : ''}`}
                                    onClick={() => setPeriod(m)}
                                >
                                    {m === 1 ? '1 mois' : `${m} mois`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Notifications ── */}
            <div className="card animate-in animate-delay-1" style={{ marginTop: 24 }}>
                <div className="settings-section-title">Notifications <span className="bdd-tag">bdd/api</span></div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label">Rapports hebdomadaires</div>
                        <div className="settings-row-desc">Recevoir un e-mail avec le résumé de la semaine</div>
                    </div>
                    <div className="settings-row-control">
                        <div className="toggle-switch on" style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label">Alertes budget</div>
                        <div className="settings-row-desc">Être prévenu lorsque les dépenses explosent</div>
                    </div>
                    <div className="settings-row-control">
                        <div className="toggle-switch" style={{ cursor: 'pointer' }} />
                    </div>
                </div>
            </div>

            {/* ── Export & Données ── */}
            <div className="card animate-in animate-delay-2" style={{ marginTop: 24 }}>
                <div className="settings-section-title">Données <span className="bdd-tag">bdd/api</span></div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label">Exporter mes données</div>
                        <div className="settings-row-desc">Télécharger tout l'historique au format CSV ou JSON</div>
                    </div>
                    <div className="settings-row-control">
                        <button className="btn btn-ghost">📥 Exporter</button>
                    </div>
                </div>

                <div className="settings-row">
                    <div className="settings-row-info">
                        <div className="settings-row-label" style={{ color: 'var(--red)' }}>Supprimer mon compte</div>
                        <div className="settings-row-desc">Efface définitivement tous vos tickets scannés</div>
                    </div>
                    <div className="settings-row-control">
                        <button className="btn btn-danger" style={{ background: 'transparent' }}>🗑 Supprimer</button>
                    </div>
                </div>
            </div>

        </div>
    )
}
