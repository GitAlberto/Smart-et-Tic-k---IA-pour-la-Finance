import { useState } from 'react'
import { useApp } from '../../AppContext'
import { authApi } from '../../services/authApi'

export default function Connexion({ onLogin, onNavigate }) {
    const { theme } = useApp()
    const [loginIdentifier, setLoginIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            await authApi.login(loginIdentifier, password)
            onLogin()
        } catch (err) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-layout" data-theme={theme}>
            <div className="auth-card animate-in">
                <div className="auth-header">
                    <div className="auth-logo">🧾</div>
                    <h1 className="auth-title">Bon retour sur Smart & Tick</h1>
                    <p className="auth-subtitle">Connectez-vous pour analyser vos tickets</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ color: 'var(--red)', fontSize: '13px', background: 'var(--red-dim)', padding: '10px', borderRadius: '4px' }}>{error}</div>}
                    <div className="form-group">
                        <label className="form-label">Email ou Pseudo</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="jean.dupont@email.com"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label">Mot de passe</label>
                            <span className="auth-link" style={{ fontSize: '11px' }} onClick={() => onNavigate('forgot-password')}>
                                Oublié ?
                            </span>
                        </div>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                        {isLoading ? 'Connexion...' : 'Se connecter'} <span className="bdd-tag" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>api</span>
                    </button>
                </form>

                <div className="auth-footer">
                    Vous n'avez pas de compte ?{' '}
                    <span className="auth-link" onClick={() => onNavigate('register')}>
                        S'inscrire
                    </span>
                </div>
            </div>
        </div>
    )
}
