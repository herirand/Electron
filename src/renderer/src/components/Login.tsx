import { useState } from 'react'
import '../styles/pos.css'

interface LoginProps {
  onLogin: (user: { id: number; username: string; role: 'admin' | 'cashier' }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await window.api.login(username, password)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>🧾 Bazar Soa</h1>
        <p className="subtitle">Logiciel de caisse</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin ou cashier"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin ou cashier"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !username || !password}>
          {loading ? 'Connexion...' : '🔐 Connexion'}
        </button>
      </form>
    </div>
  )
}