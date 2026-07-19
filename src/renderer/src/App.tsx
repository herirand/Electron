import { useState } from 'react'
import Login from './components/Login'
import Cashier from './components/Cashier'
import Admin from './components/Admin'
import SalesHistory from './components/SalesHistory'
import './styles/pos.css'

type Page = 'caisse' | 'credits' | 'admin' | 'sales'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('caisse')

  if (!user) return <Login onLogin={setUser} />

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1 className="logo">Bazar Soa</h1>

        <button
          className={`nav-pill ${page === 'caisse' ? 'active' : ''}`}
          onClick={() => setPage('caisse')}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3H5L5.4 5M5.4 5H21L18 13H7M5.4 5L7 13M7 13L5.6 15.6C5.2 16.4 5.8 17.4 6.7 17.4H18M9 21C9.6 21 10 20.6 10 20C10 19.4 9.6 19 9 19C8.4 19 8 19.4 8 20C8 20.6 8.4 21 9 21ZM18 21C18.6 21 19 20.6 19 20C19 19.4 18.6 19 18 19C17.4 19 17 19.4 17 20C17 20.6 17.4 21 18 21Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Caisse
        </button>

        <button
          className={`nav-pill ${page === 'credits' ? 'active' : ''}`}
          onClick={() => setPage('credits')}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Crédits
        </button>

        {user.role === 'admin' && (
          <>
            <button
              className={`nav-pill ${page === 'admin' ? 'active' : ''}`}
              onClick={() => setPage('admin')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 8L12 3L3 8M21 8L12 13M21 8V16L12 21M12 13L3 8M12 13V21M3 8V16L12 21"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Stock
            </button>
            <button
              className={`nav-pill ${page === 'sales' ? 'active' : ''}`}
              onClick={() => setPage('sales')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 20V10M10 20V4M16 20V14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Ventes
            </button>
          </>
        )}

        <button className="logout-btn" onClick={() => setUser(null)} title="Déconnexion">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9M16 17L21 12L16 7M21 12H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>

      <div className="main-content">
        {page === 'caisse' && <Cashier user={user} view="caisse" />}
        {page === 'credits' && <Cashier user={user} view="credits" />}
        {page === 'admin' && user.role === 'admin' && <Admin />}
        {page === 'sales' && user.role === 'admin' && <SalesHistory />}
      </div>
    </div>
  )
}