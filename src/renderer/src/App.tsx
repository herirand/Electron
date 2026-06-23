import { useState } from 'react'
import Login from './components/Login'
import Cashier from './components/Cashier'
import Admin from './components/Admin'
import SalesHistory from './components/SalesHistory'
import './styles/pos.css'

type Page = 'caisse' | 'admin' | 'sales'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('caisse')

  if (!user) return <Login onLogin={setUser} />

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1>🧾 Bazar Soa</h1>

        <button
          className={`nav-btn ${page === 'caisse' ? 'active' : ''}`}
          onClick={() => setPage('caisse')}
        >
          🛒 Caisse
        </button>

        {user.role === 'admin' && (
          <>
            <button
              className={`nav-btn ${page === 'admin' ? 'active' : ''}`}
              onClick={() => setPage('admin')}
            >
              ⚙️ Produits
            </button>
            <button
              className={`nav-btn ${page === 'sales' ? 'active' : ''}`}
              onClick={() => setPage('sales')}
            >
              📊 Ventes
            </button>
          </>
        )}

        <button className="nav-btn" onClick={() => window.api.openTicketsFolder()}>
          🧾 Tickets
        </button>

        <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 8 }}>
          {user.role === 'admin' ? '👑 Admin' : '👤 Caissier'}
        </span>

        <button className="nav-btn logout" onClick={() => setUser(null)}>
          🚪 Déconnexion
        </button>
      </nav>

      <div className="main-content">
        {page === 'caisse' && <Cashier user={user} />}
        {page === 'admin' && user.role === 'admin' && <Admin />}
        {page === 'sales' && user.role === 'admin' && <SalesHistory />}
      </div>
    </div>
  )
}