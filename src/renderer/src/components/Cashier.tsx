import { useState, useMemo, useEffect } from 'react'
import { getErrorMsg } from '../hooks/useApi'

interface CashierProps {
  user: User
}

interface CartItem {
  product: Product
  quantity: number
}

type CashierTab = 'caisse' | 'credits'

export default function Cashier({ user }: CashierProps) {
  const [activeTab, setActiveTab] = useState<CashierTab>('caisse')

  return (
    <div>
      <div className="admin-tabs" style={{ marginBottom: 20 }}>
        <button
          className={`admin-tab ${activeTab === 'caisse' ? 'active' : ''}`}
          onClick={() => setActiveTab('caisse')}
        >
          🛒 Caisse
        </button>
        <button
          className={`admin-tab ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          💳 Crédits
        </button>
      </div>

      {activeTab === 'caisse' && <CaisseTab user={user} />}
      {activeTab === 'credits' && <CashierCreditsTab user={user} />}
    </div>
  )
}

function CaisseTab({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isCredit, setIsCredit] = useState(false)
  const [creditClientName, setCreditClientName] = useState('')

  useEffect(() => {
    window.api.getProducts().then(setProducts)
    window.api.getClients().then(setClients)
  }, [])

  const results = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  )

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdd = () => {
    if (selectedIds.size === 0) return

    const productsToAdd = products.filter((p) => selectedIds.has(p.id))

    setCart((prev) => {
      const newCart = [...prev]
      for (const product of productsToAdd) {
        const existing = newCart.find((i) => i.product.id === product.id)
        if (existing) {
          const idx = newCart.indexOf(existing)
          newCart[idx] = { ...existing, quantity: existing.quantity + 1 }
        } else {
          newCart.push({ product, quantity: 1 })
        }
      }
      return newCart
    })

    setSearch('')
    setSelectedIds(new Set())
  }

  const handleSaveEdit = () => {
    if (!editingItem) return
    setCart((prev) =>
      prev.map((i) => (i.product.id === editingItem.product.id ? { ...i, quantity: editQty } : i))
    )
    setEditingItem(null)
  }

  const handleDeleteRow = () => {
    if (!editingItem) return
    setCart((prev) => prev.filter((i) => i.product.id !== editingItem.product.id))
    setEditingItem(null)
  }

  const handleValidate = async () => {
    if (cart.length === 0) return
    if (isCredit && !creditClientName.trim()) {
      showToast('error', 'Le nom du client est requis pour un crédit')
      return
    }
    setLoading(true)
    try {
      await window.api.createSale(
        cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.price
        })),
        user.username,
        selectedClientId || undefined,
        isCredit,
        isCredit ? creditClientName.trim() : undefined
      )
      showToast('success', isCredit ? 'Crédit enregistré' : 'Vente enregistrée')
      setCart([])
      setSelectedClientId(null)
      setIsCredit(false)
      setCreditClientName('')
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la vente'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cashier-layout">
      <div className="cashier-table-panel">
        <table className="cashier-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix unitaire</th>
              <th>Quantite</th>
              <th>Prix</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr
                key={item.product.id}
                onClick={() => {
                  setEditingItem(item)
                  setEditQty(item.quantity)
                }}
              >
                <td>{item.product.name}</td>
                <td>{item.product.price.toLocaleString()} Ar</td>
                <td>{item.quantity}</td>
                <td>{(item.product.price * item.quantity).toLocaleString()} Ar</td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  Aucun produit ajoute
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <div className="cashier-total-row" style={{ flex: 1, marginTop: 0 }}>
            <span>TOTAL</span>
            <span>{total.toLocaleString()} Ar</span>
          </div>
          {clients.length > 0 && !isCredit && (
            <div style={{ flex: 1 }}>
              <select
                className="search-bar-wrapper"
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
                style={{ width: '100%', padding: '14px 16px', fontSize: 14 }}
              >
                <option value="">Client (optionnel)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isCredit && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              value={creditClientName}
              onChange={(e) => setCreditClientName(e.target.value)}
              placeholder="Nom du client pour le crédit..."
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 14,
                border: '1.5px solid var(--border)',
                borderRadius: 30,
                outline: 'none'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button
            className="btn-validate"
            onClick={() => {
              setIsCredit(false)
              handleValidate()
            }}
            disabled={cart.length === 0 || loading || isCredit}
            style={{ flex: 1, opacity: isCredit ? 0.5 : 1 }}
          >
            {loading && !isCredit ? 'Validation...' : 'Valider la vente'}
          </button>
          <button
            className="btn-validate"
            onClick={() => {
              setIsCredit(true)
              handleValidate()
            }}
            disabled={cart.length === 0 || loading || !isCredit}
            style={{
              flex: 1,
              background: isCredit ? 'var(--danger)' : 'var(--bg-card)',
              color: isCredit ? 'white' : 'var(--text-primary)',
              opacity: !isCredit && cart.length > 0 ? 1 : cart.length === 0 ? 0.35 : 1
            }}
          >
            {loading && isCredit ? 'Validation...' : 'Vente à crédit'}
          </button>
        </div>
        {!isCredit && cart.length > 0 && (
          <button
            onClick={() => setIsCredit(true)}
            style={{
              marginTop: 8,
              padding: '10px',
              border: '1px dashed var(--danger)',
              borderRadius: 30,
              background: 'transparent',
              color: 'var(--danger)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              width: '100%'
            }}
          >
            💳 Créditer cette vente
          </button>
        )}
        {isCredit && (
          <button
            onClick={() => {
              setIsCredit(false)
              setCreditClientName('')
            }}
            style={{
              marginTop: 8,
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: 30,
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              width: '100%'
            }}
          >
            Annuler le crédit
          </button>
        )}
      </div>

      <div className="cashier-search-panel">
        <div className="search-bar-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M21 21L16.5 16.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIds(new Set())
            }}
            placeholder="Rechercher un produit..."
          />
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((p) => (
              <div
                key={p.id}
                className={`search-result-row ${selectedIds.has(p.id) ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(p.id)) {
                      next.delete(p.id)
                    } else {
                      next.add(p.id)
                    }
                    return next
                  })
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: '1.5px solid var(--border)',
                      background: selectedIds.has(p.id) ? 'var(--text-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {selectedIds.has(p.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {p.name}
                </span>
                <span>{p.price.toLocaleString()} Ar</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn-add-product" onClick={handleAdd} disabled={selectedIds.size === 0}>
          {selectedIds.size > 0 ? `AJOUTER (${selectedIds.size})` : 'AJOUTER'}
        </button>
      </div>

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem.product.name}</h3>
            <div className="form-group">
              <label>Quantite</label>
              <input
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleSaveEdit}>
                Modifier
              </button>
              <button className="btn-delete" onClick={handleDeleteRow}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

function CashierCreditsTab({ user }: { user: User }) {
  const [credits, setCredits] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [validatingId, setValidatingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const loadCredits = () => {
    setLoading(true)
    window.api.getCredits().then((data) => {
      setCredits(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadCredits()
  }, [])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePayCredit = async (saleId: number) => {
    try {
      await window.api.payCredit(saleId, user.username)
      showToast('success', 'Crédit marqué comme payé')
      setValidatingId(null)
      loadCredits()
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la validation'))
    }
  }

  const pendingCredits = credits.filter((c) => c.status === 'credit')
  const paidCredits = credits.filter((c) => c.status === 'paid' && c.paid_at)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
  }

  return (
    <div>
      {pendingCredits.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Crédits en attente ({pendingCredits.length})
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vente #</th>
                <th>Date</th>
                <th>Client</th>
                <th>Total</th>
                <th>Créé par</th>
                <th>Articles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingCredits.map((sale) => (
                <tr key={sale.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>#{sale.id}</td>
                  <td>
                    {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    <strong>{sale.client_name || sale.client_nom || '—'}</strong>
                  </td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    {sale.total.toLocaleString()} Ar
                  </td>
                  <td>{sale.created_by || sale.cashier}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>
                    {Array.isArray(sale.items) &&
                      sale.items
                        .filter(Boolean)
                        .map((item) => `${item.name} ×${item.quantity}`)
                        .join(', ')}
                  </td>
                  <td>
                    {validatingId === sale.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn-add"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            background: 'var(--success)'
                          }}
                          onClick={() => handlePayCredit(sale.id)}
                        >
                          Confirmer le paiement
                        </button>
                        <button
                          className="btn-edit"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => setValidatingId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-add"
                        style={{ background: 'var(--success)' }}
                        onClick={() => setValidatingId(sale.id)}
                      >
                        💰 Payer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingCredits.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--text-secondary)',
            marginBottom: 30
          }}
        >
          Aucun crédit en attente
        </div>
      )}

      {paidCredits.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Crédits payés ({paidCredits.length})
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vente #</th>
                <th>Date création</th>
                <th>Client</th>
                <th>Total</th>
                <th>Créé par</th>
                <th>Payé le</th>
                <th>Validé par</th>
              </tr>
            </thead>
            <tbody>
              {paidCredits.map((sale) => (
                <tr key={sale.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>#{sale.id}</td>
                  <td>
                    {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    <strong>{sale.client_name || sale.client_nom || '—'}</strong>
                  </td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                    {sale.total.toLocaleString()} Ar
                  </td>
                  <td>{sale.created_by || sale.cashier}</td>
                  <td>
                    {sale.paid_at
                      ? new Date(sale.paid_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </td>
                  <td>{sale.validated_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paidCredits.length === 0 && pendingCredits.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Aucun crédit dans le système
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
