import { useState } from 'react'
import { useApp } from '../../AppContext'
import { authApi } from '../../services/authApi'

export default function MotDePasseOublie({ onNavigate }) {
    const { theme } = useApp()
    const [email, setEmail] = useState('')
    const [statusMessage, setStatusMessage] = useState(null)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setStatusMessage(null)
        setIsLoading(true)

        try {
            const res = await authApi.forgotPassword(email)
            setStatusMessage(res.message)
            // Dev only: show the token or link
            if (res.debug_reset_token) {
                console.log("DEV ONLY: Reset Token =>", res.debug_reset_token)
            }
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
                    <div className="icon-btn" style={{ margin: '0 auto 20px', width: '48px', height: '48px', fontSize: '20px' }}>
                        🔒
                    </div>
                    <h1 className="auth-title">Mot de passe oublié</h1>
                    <p className="auth-subtitle">Entrez votre email pour recevoir un lien de réinitialisation sécurisé.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ color: 'var(--red)', fontSize: '13px', background: 'var(--red-dim)', padding: '10px', borderRadius: '4px' }}>{error}</div>}
                    {statusMessage && <div style={{ color: 'var(--green)', fontSize: '13px', background: 'var(--green-dim)', padding: '10px', borderRadius: '4px' }}>{statusMessage}</div>}

                    <div className="form-group">
                        <label className="form-label">Adresse email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="jean.dupont@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                        {isLoading ? 'Envoi...' : 'Envoyer le lien'} <span className="bdd-tag" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>api</span>
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: '32px' }}>
                    <span className="auth-link" onClick={() => onNavigate('login')}>
                        ← Retour à la connexion
                    </span>
                </div>
            </div>
        </div>
    )
}
