import { useState } from 'react'
import { getErrorMsg } from '../hooks/useApi'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(String(product?.price || ''))
  const [quantity, setQuantity] = useState(String(product?.quantity || ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!product

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const priceNum = parseFloat(price)
      const qtyNum = parseInt(quantity) || 0
      if (!name.trim()) throw new Error('Le nom est requis')
      if (isNaN(priceNum) || priceNum <= 0) throw new Error('Le prix doit être un nombre positif')

      if (isEdit && product) {
        await window.api.updateProduct({ id: product.id, name: name.trim(), price: priceNum })
        if (qtyNum !== product.quantity) {
          await window.api.updateStock(product.id, qtyNum)
        }
      } else {
        await window.api.addProduct({ name: name.trim(), price: priceNum, quantity: qtyNum })
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h3>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du produit</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label>Prix unitaire (Ar)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="50" />
          </div>

          <div className="form-group">
            <label>Quantité en stock</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? '💾 Modifier' : '💾 Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}