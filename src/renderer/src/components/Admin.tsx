import { useState, useEffect, useMemo } from 'react'
import ProductForm from './ProductForm'

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null | 'new'>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const loadProducts = () => window.api.getProducts().then(setProducts)

  useEffect(() => {
    loadProducts()
  }, [])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleReset = async () => {
    if (!confirm('⚠️ Réinitialiser la base ? Toutes les ventes et produits seront effacés.')) return
    if (!confirm('✅ Confirmer ? Cette action est irréversible.')) return
    try {
      await window.api.resetDatabase()
      showToast('success', 'Base réinitialisée avec les produits par défaut')
      loadProducts()
    } catch (err) {
      showToast('error', 'Erreur lors de la réinitialisation')
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer "${product.name}" ?`)) return
    try {
      await window.api.deleteProduct(product.id)
      showToast('success', `"${product.name}" supprimé`)
      loadProducts()
    } catch (err) {
      showToast('error', 'Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h2>⚙️ Gestion des produits</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-add" onClick={() => setEditing('new')}>➕ Nouveau produit</button>
          <button className="btn-delete" onClick={handleReset}>🔄 Réinitialiser</button>
        </div>
      </div>

      <input
        className="search-bar"
        type="text"
        placeholder="🔍 Rechercher un produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Prix</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((product) => (
            <tr key={product.id}>
              <td style={{ color: 'var(--text-secondary)' }}>{product.id}</td>
              <td><strong>{product.name}</strong></td>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {product.price.toLocaleString()} Ar
              </td>
              <td>{product.quantity}</td>
              <td>
                <button className="btn-edit" onClick={() => setEditing(product)}>✏️ Modifier</button>
                <button className="btn-delete" onClick={() => handleDelete(product)}>🗑 Supprimer</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                {products.length === 0
                  ? 'Aucun produit. Cliquez sur "Nouveau produit" pour commencer.'
                  : 'Aucun produit trouvé.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            showToast('success', editing === 'new' ? 'Produit ajouté' : 'Produit modifié')
            loadProducts()
          }}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}