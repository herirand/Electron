import { useState } from 'react'
import { getErrorMsg } from '../hooks/useApi'
interface Props {
  onClose: () => void
  onSaved: () => void
}
export default function UserForm({ onClose, onSaved }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await window.api.signup(username, password)
      onSaved()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur lors de la création'))
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>➕ Nouveau caissier</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 4,
                display: 'block'
              }}
            >
              Nom d&apos;utilisateur
            </label>
            <input
              type="text"
              className="search-bar"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: caissier2"
              autoFocus
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 4,
                display: 'block'
              }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              className="search-bar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 caractères"
              required
            />
          </div>
          {error && (
            <div className="error-msg" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-add" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
