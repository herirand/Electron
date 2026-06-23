import { useState, useEffect, useMemo } from 'react'
import Cart from './Cart'
import type { CartItem } from './Cart'
import { getErrorMsg } from '../hooks/useApi'

interface CashierProps {
  user: User
}

export default function Cashier({ user }: CashierProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    window.api.getProducts().then(setProducts)
  }, [])

  // Filtrer produits par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  // Ajouter au panier avec fenêtre quantité
  const [qtyModal, setQtyModal] = useState<{ product: Product } | null>(null)
  const [qtyValue, setQtyValue] = useState(1)

  const openQtyModal = (product: Product) => {
    setQtyValue(1)
    setQtyModal({ product })
  }

  const confirmQty = () => {
    if (!qtyModal) return
    const { product } = qtyModal
    const qty = Math.max(1, qtyValue)

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { product, quantity: qty }]
    })

    setQtyModal(null)
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const clearCart = () => setCart([])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const items = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.product.price
      }))
      const result = await window.api.createSale(items, user.username)
      showToast('success', `✅ Vente validée — ${result.total.toLocaleString()} Ar`)
      setCart([])
      // Recharger les stocks
      const updated = await window.api.getProducts()
      setProducts(updated)
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la vente'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ padding: '10px 0' }}>
        <input
          className="search-bar"
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="cashier-layout">
        <div className="products-grid">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => {
                if (product.quantity <= 0) return
                openQtyModal(product)
              }}
              style={{ opacity: product.quantity <= 0 ? 0.4 : 1 }}
            >
              <div className="name">{product.name}</div>
              <div className="price">{product.price.toLocaleString()} Ar</div>
              <div className={`stock ${product.quantity <= 0 ? 'out' : product.quantity < 5 ? 'low' : ''}`}>
                {product.quantity <= 0 ? 'Rupture' : `Stock: ${product.quantity}`}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
              Aucun produit trouvé
            </div>
          )}
        </div>

        <Cart
          items={cart}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={handleCheckout}
          loading={loading}
        />
      </div>

      {/* Modal quantité */}
      {qtyModal && (
        <div className="modal-overlay" onClick={() => setQtyModal(null)}>
          <div className="modal qty-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{qtyModal.product.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
              Prix unitaire : {qtyModal.product.price.toLocaleString()} Ar
            </p>
            <div className="qty-display">{qtyValue}</div>
            <div className="qty-buttons">
              <button onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}>−</button>
              <button onClick={() => setQtyValue(qtyValue + 1)}>+</button>
            </div>
            <div className="qty-presets">
              {[1, 2, 3, 5, 10, 15, 20, 25].map((n) => (
                <button key={n} onClick={() => setQtyValue(n)}>{n}</button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setQtyModal(null)}>Annuler</button>
              <button className="btn-primary" onClick={confirmQty}>
                Ajouter — {(qtyModal.product.price * qtyValue).toLocaleString()} Ar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}