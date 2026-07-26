import { useState, useEffect } from 'react'
import { getErrorMsg } from '../hooks/useApi'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(String(product?.price || ''))
  const [purchasePrice, setPurchasePrice] = useState(String(product?.purchase_price || ''))
  const [familleId, setFamilleId] = useState<number | ''>(product?.famille_id || '')
  const [stockBoutique, setStockBoutique] = useState(String(product?.stock_boutique || '0'))
  const [stockEntrepot, setStockEntrepot] = useState(String(product?.stock_entrepot || '0'))
  const [codeBarre, setCodeBarre] = useState(product?.code_barre || '')
  const [familles, setFamilles] = useState<Famille[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!product

  useEffect(() => {
    window.api.getCategories().then(setFamilles)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const priceNum = parseFloat(price)
      const purchasePriceNum = parseFloat(purchasePrice) || 0
      const sbNum = parseInt(stockBoutique) || 0
      const seNum = parseInt(stockEntrepot) || 0
      if (!name.trim()) throw new Error('Le nom est requis')
      if (isNaN(priceNum) || priceNum <= 0) throw new Error('Le prix doit être un nombre positif')
      if (purchasePriceNum < 0) throw new Error("Le prix d'achat ne peut pas être négatif")

      const data = {
        name: name.trim(),
        price: priceNum,
        purchase_price: purchasePriceNum,
        famille_id: familleId || undefined,
        stock_boutique: sbNum,
        stock_entrepot: seNum,
        code_barre: codeBarre || undefined
      }

      if (isEdit && product) {
        await window.api.updateProduct({ id: product.id, ...data })
      } else {
        await window.api.addProduct(data)
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

        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du produit</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label>Prix unitaire (Ar)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="1"
            />
          </div>

          <div className="form-group">
            <label>Prix d'achat (Ar)</label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min="0"
              step="1"
            />
          </div>

          <div className="form-group">
            <label>Catégorie</label>
            <select value={familleId} onChange={(e) => setFamilleId(Number(e.target.value) || '')}>
              <option value="">Aucune catégorie</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Stock boutique</label>
              <input
                type="number"
                value={stockBoutique}
                onChange={(e) => setStockBoutique(e.target.value)}
                min="0"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Stock entrepôt</label>
              <input
                type="number"
                value={stockEntrepot}
                onChange={(e) => setStockEntrepot(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Code-barres</label>
            <input
              type="text"
              value={codeBarre}
              onChange={(e) => setCodeBarre(e.target.value)}
              placeholder="Optionnel"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
