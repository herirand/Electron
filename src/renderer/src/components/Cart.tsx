interface CartItem {
  product: Product
  quantity: number
}

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: number, delta: number) => void
  onRemove: (productId: number) => void
  onClear: () => void
  onCheckout: () => void
  loading: boolean
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
  loading
}: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <div className="cart-panel">
      <div className="cart-header">
        🛒 Panier ({items.length} article{items.length > 1 ? 's' : ''})
      </div>

      <div className="cart-items">
        {items.length === 0 && (
          <div className="cart-empty">Cliquez sur un produit pour ajouter au panier</div>
        )}

        {items.map((item) => (
          <div key={item.product.id} className="cart-item">
            <span className="item-name">{item.product.name}</span>
            <div className="item-qty">
              <button
                onClick={() => onUpdateQuantity(item.product.id, -1)}
                disabled={item.quantity <= 1}
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => onUpdateQuantity(item.product.id, 1)}>+</button>
            </div>
            <span className="item-total">
              {(item.product.price * item.quantity).toLocaleString()} Ar
            </span>
            <button className="item-remove" onClick={() => onRemove(item.product.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          <span>Total</span>
          <span className="total-value">{total.toLocaleString()} Ar</span>
        </div>
        <div className="cart-actions">
          <button
            className="btn-success"
            onClick={onCheckout}
            disabled={items.length === 0 || loading}
          >
            {loading ? 'Validation...' : '💰 Valider la vente'}
          </button>
          <button className="btn-danger" onClick={onClear} disabled={items.length === 0}>
            🗑 Vider
          </button>
        </div>
      </div>
    </div>
  )
}

export type { CartItem }
