import { useState } from 'react'
import { useApp } from '../../AppContext'
import { authApi } from '../../services/authApi'

export default function Inscription({ onRegister, onNavigate }) {
    const { theme } = useApp()
    const [pseudo, setPseudo] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.")
            return
        }

        setIsLoading(true)
        try {
            await authApi.register(pseudo, email, password)
            await authApi.login(email, password)
            onRegister()
        } catch (err) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-layout" data-theme={theme}>
            <div className="auth-card animate-in">
                <div className="auth-header" style={{ marginBottom: '24px' }}>
                    <h1 className="auth-title">Créer un compte</h1>
                    <p className="auth-subtitle">Rejoignez Smart & Tick en quelques clics</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {error && <div style={{ color: 'var(--red)', fontSize: '13px', background: 'var(--red-dim)', padding: '10px', borderRadius: '4px' }}>{error}</div>}

                    <div className="form-grid">
                        <div className="form-group auth-form-full-span" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Pseudo (Unique)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="jean_d"
                                value={pseudo}
                                onChange={e => setPseudo(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Adresse email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="jean.dupont@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                        {isLoading ? "Création..." : "S'inscrire"} <span className="bdd-tag" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>api</span>
                    </button>
                </form>

                <div className="auth-footer">
                    Vous avez déjà un compte ?{' '}
                    <span className="auth-link" onClick={() => onNavigate('login')}>
                        Se connecter
                    </span>
                </div>
            </div>
        </div>
    )
}
