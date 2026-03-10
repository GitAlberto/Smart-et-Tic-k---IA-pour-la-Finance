import { useState, useEffect } from 'react'
import { useApp } from '../../AppContext'
import { authApi } from '../../services/authApi'

export default function ReinitialiserMotDePasse({ onNavigate, token }) {
    const { theme } = useApp()
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [statusMessage, setStatusMessage] = useState(null)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setError("Jeton de réinitialisation manquant ou invalide.")
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setStatusMessage(null)

        if (password !== passwordConfirm) {
            setError("Les mots de passe ne correspondent pas.")
            return
        }

        if (!token) {
            setError("Aucun jeton fourni (URL invalide).")
            return
        }

        setIsLoading(true)
        try {
            const res = await authApi.resetPassword(token, password)
            setStatusMessage(res.message)
            setIsSuccess(true)
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
                        🔑
                    </div>
                    <h1 className="auth-title">Nouveau mot de passe</h1>
                    <p className="auth-subtitle">Choisissez un nouveau mot de passe sécurisé pour votre compte.</p>
                </div>

                {!isSuccess ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {error && <div style={{ color: 'var(--red)', fontSize: '13px', background: 'var(--red-dim)', padding: '10px', borderRadius: '4px' }}>{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Nouveau mot de passe</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmez le mot de passe</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={isLoading || !token} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                            {isLoading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'} <span className="bdd-tag" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>api</span>
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ color: 'var(--green)', fontSize: '14px', background: 'var(--green-dim)', padding: '15px', borderRadius: '8px', border: '1px solid var(--green)' }}>
                            ✅ {statusMessage}
                        </div>
                        <button className="btn btn-primary" onClick={() => {
                            // Supprimer le token de l'url en remettant à propre
                            window.history.replaceState({}, document.title, window.location.pathname)
                            onNavigate('login')
                        }} style={{ width: '100%', justifyContent: 'center' }}>
                            Se connecter maintenant
                        </button>
                    </div>
                )}

                <div className="auth-footer" style={{ marginTop: '32px' }}>
                    <span className="auth-link" onClick={() => {
                        window.history.replaceState({}, document.title, window.location.pathname)
                        onNavigate('login')
                    }}>
                        ← Annuler et retourner à la connexion
                    </span>
                </div>
            </div>
        </div>
    )
}
