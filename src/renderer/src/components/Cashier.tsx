import { useState, useMemo, useEffect } from 'react'

interface CashierProps {
  user: User
}

interface CartItem {
  product: Product
  quantity: number
}

export default function Cashier({ user }: CashierProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    window.api.getProducts().then(setProducts)
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
    if (selectedId === null) return
    const product = products.find((p) => p.id === selectedId)
    if (!product) return

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })

    setSearch('')
    setSelectedId(null)
  }

  const handleSaveEdit = () => {
    if (!editingItem) return
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === editingItem.product.id ? { ...i, quantity: editQty } : i
      )
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
    setLoading(true)
    try {
      await window.api.createSale(
        cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.price
        })),
        user.username
      )
      showToast('success', 'Vente enregistrée')
      setCart([])
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur lors de la vente')
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
              <th>Quantité</th>
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
                <td colSpan={4} className="empty-row">Aucun produit ajouté</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="cashier-total-row">
          <span>TOTAL</span>
          <span>{total.toLocaleString()} Ar</span>
        </div>

        <button
          className="btn-validate"
          onClick={handleValidate}
          disabled={cart.length === 0 || loading}
        >
          {loading ? 'Validation...' : 'Valider la vente'}
        </button>
      </div>

      <div className="cashier-search-panel">
        <div className="search-bar-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M21 21L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedId(null)
            }}
            placeholder="Rechercher un produit..."
          />
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((p) => (
              <div
                key={p.id}
                className={`search-result-row ${selectedId === p.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span>{p.name}</span>
                <span>{p.price.toLocaleString()} Ar</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn-add-product" onClick={handleAdd} disabled={selectedId === null}>
          AJOUTER
        </button>
      </div>

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem.product.name}</h3>
            <div className="form-group">
              <label>Quantité</label>
              <input
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleSaveEdit}>Modifier</button>
              <button className="btn-delete" onClick={handleDeleteRow}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}