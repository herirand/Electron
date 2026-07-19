import { useState, useEffect, useMemo, useCallback } from 'react'
import ProductForm from './ProductForm'
import UserForm from './UserForm'
import { getErrorMsg } from '../hooks/useApi'

type Tab =
  | 'products'
  | 'users'
  | 'categories'
  | 'clients'
  | 'fournisseurs'
  | 'transfert'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('products')
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Famille[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categoryCounts, setCategoryCounts] = useState<
    { categoryId: number | null; categoryName: string | null; count: number }[]
  >([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Product | null | 'new'>(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState<Famille | null | 'new'>(null)
  const [showClientForm, setShowClientForm] = useState<Client | null | 'new'>(null)
  const [showFournisseurForm, setShowFournisseurForm] = useState<Fournisseur | null | 'new'>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return filteredProducts.filter((p) => p.name.toLowerCase().includes(q))
  }, [filteredProducts, search])

  const loadProducts = useCallback(
    () => window.api.getProductsByCategory(selectedCategoryId).then(setFilteredProducts),
    [selectedCategoryId]
  )
  const loadCategoryCounts = () => window.api.countProductsByCategory().then(setCategoryCounts)
  const loadUsers = () => window.api.getUsers().then(setUsers)
  const loadCategories = () => window.api.getCategories().then(setCategories)
  const loadClients = () => window.api.getClients().then(setClients)
  const loadFournisseurs = () => window.api.getFournisseurs().then(setFournisseurs)

  useEffect(() => {
    loadProducts()
    loadCategoryCounts()
    loadUsers()
    loadCategories()
    loadClients()
    loadFournisseurs()
  }, [loadProducts])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleReset = async () => {
    if (!confirm('Réinitialiser la base ? Toutes les ventes et produits seront effacés.')) return
    if (!confirm('Confirmer ? Cette action est irréversible.')) return
    try {
      await window.api.resetDatabase()
      showToast('success', 'Base réinitialisée avec les produits par défaut')
      loadProducts()
    } catch (err) {
      showToast('error', 'Erreur lors de la réinitialisation')
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Supprimer "${product.name}" ?`)) return
    try {
      await window.api.deleteProduct(product.id)
      showToast('success', `"${product.name}" supprimé`)
      loadProducts()
    } catch (err) {
      showToast('error', 'Erreur lors de la suppression')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Supprimer le caissier "${user.username}" ?`)) return
    try {
      await window.api.deleteUser(user.id)
      showToast('success', `"${user.username}" supprimé`)
      loadUsers()
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  const handleDeleteCategory = async (cat: Famille) => {
    if (!confirm(`Supprimer la catégorie "${cat.nom}" ?`)) return
    try {
      await window.api.deleteCategory(cat.id)
      showToast('success', `"${cat.nom}" supprimé`)
      loadCategories()
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Supprimer le client "${client.nom}" ?`)) return
    try {
      await window.api.deleteClient(client.id)
      showToast('success', `"${client.nom}" supprimé`)
      loadClients()
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  const handleDeleteFournisseur = async (f: Fournisseur) => {
    if (!confirm(`Supprimer le fournisseur "${f.nom}" ?`)) return
    try {
      await window.api.deleteFournisseur(f.id)
      showToast('success', `"${f.nom}" supprimé`)
      loadFournisseurs()
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'products', label: 'Produits', icon: '📦' },
    { key: 'transfert', label: 'Transfert', icon: '🔄' },
    { key: 'categories', label: 'Catégories', icon: '🏷' },
    { key: 'clients', label: 'Clients', icon: '👤' },
    { key: 'fournisseurs', label: 'Fournisseurs', icon: '🚚' },
    { key: 'users', label: 'Utilisateurs', icon: '👥' }
  ]

  return (
    <div>
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          <div className="admin-header">
            <h2>Gestion des produits</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-add" onClick={() => setEditing('new')}>
                Nouveau produit
              </button>
              <button className="btn-delete" onClick={handleReset}>
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="cashier-search-panel" style={{ height: 'auto', marginBottom: 20 }}>
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
                  setSelectedId(null)
                }}
                placeholder="Rechercher un produit..."
              />
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    className={`search-result-row ${selectedId === p.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedId(p.id)
                      setEditing(p)
                      setSearch('')
                      setSelectedId(null)
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {p.price.toLocaleString()} Ar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="category-filter-bar">
              {categoryCounts.map((cat) => (
                <button
                  key={cat.categoryId ?? 'none'}
                  className={`category-filter-pill ${selectedCategoryId === cat.categoryId ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedCategoryId(
                      selectedCategoryId === cat.categoryId ? null : cat.categoryId
                    )
                  }
                >
                  {cat.categoryName ?? 'Sans categorie'} ({cat.count})
                </button>
              ))}
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Prix d'achat</th>
                <th>Boutique</th>
                <th>Entrepôt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{product.id}</td>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{product.famille_nom || '—'}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {product.price.toLocaleString()} Ar
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {product.purchase_price.toLocaleString()} Ar
                  </td>
                  <td>{product.stock_boutique}</td>
                  <td>{product.stock_entrepot}</td>
                  <td>
                    <button className="btn-edit" onClick={() => setEditing(product)}>
                      Modifier
                    </button>
                    <button className="btn-delete" onClick={() => handleDeleteProduct(product)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
                  >
                    {selectedCategoryId !== null
                      ? 'Aucune produit dans cette categorie.'
                      : 'Aucun produit. Cliquez sur "Nouveau produit" pour commencer.'}
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
                showToast('success', editing === 'new' ? 'Produit ajoute' : 'Produit modifie')
                loadProducts()
              }}
            />
          )}
        </>
      )}

      {tab === 'transfert' && <TransfertTab onNotify={(type, msg) => showToast(type, msg)} />}

      {tab === 'categories' && (
        <CategoriesTab
          categories={categories}
          onAdd={() => setShowCategoryForm('new')}
          onEdit={(cat) => setShowCategoryForm(cat)}
          onDelete={handleDeleteCategory}
        />
      )}

      {tab === 'clients' && (
        <ClientsTab
          clients={clients}
          onAdd={() => setShowClientForm('new')}
          onEdit={(c) => setShowClientForm(c)}
          onDelete={handleDeleteClient}
        />
      )}

      {tab === 'fournisseurs' && (
        <FournisseursTab
          fournisseurs={fournisseurs}
          onAdd={() => setShowFournisseurForm('new')}
          onEdit={(f) => setShowFournisseurForm(f)}
          onDelete={handleDeleteFournisseur}
        />
      )}

      {tab === 'users' && (
        <>
          <div className="admin-header">
            <h2>Gestion des utilisateurs</h2>
            <button className="btn-add" onClick={() => setShowUserForm(true)}>
              Nouveau caissier
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.id}</td>
                  <td>
                    <strong>{u.username}</strong>
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role === 'admin' ? 'Admin' : 'Caissier'}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className="btn-delete" onClick={() => handleDeleteUser(u)}>
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
                  >
                    Aucun utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {showUserForm && (
            <UserForm
              onClose={() => setShowUserForm(false)}
              onSaved={() => {
                showToast('success', 'Caisser cree avec succes')
                setShowUserForm(false)
                loadUsers()
              }}
            />
          )}
        </>
      )}

      {showCategoryForm && (
        <CategoryForm
          category={showCategoryForm === 'new' ? null : showCategoryForm}
          onClose={() => setShowCategoryForm(null)}
          onSaved={() => {
            showToast(
              'success',
              showCategoryForm === 'new' ? 'Categorie ajoutee' : 'Categorie modifiee'
            )
            setShowCategoryForm(null)
            loadCategories()
          }}
        />
      )}

      {showClientForm && (
        <ClientForm
          client={showClientForm === 'new' ? null : showClientForm}
          onClose={() => setShowClientForm(null)}
          onSaved={() => {
            showToast('success', showClientForm === 'new' ? 'Client ajoute' : 'Client modifie')
            setShowClientForm(null)
            loadClients()
          }}
        />
      )}

      {showFournisseurForm && (
        <FournisseurForm
          fournisseur={showFournisseurForm === 'new' ? null : showFournisseurForm}
          onClose={() => setShowFournisseurForm(null)}
          onSaved={() => {
            showToast(
              'success',
              showFournisseurForm === 'new' ? 'Fournisseur ajoute' : 'Fournisseur modifie'
            )
            setShowFournisseurForm(null)
            loadFournisseurs()
          }}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

function CategoriesTab({
  categories,
  onAdd,
  onEdit,
  onDelete
}: {
  categories: Famille[]
  onAdd: () => void
  onEdit: (cat: Famille) => void
  onDelete: (cat: Famille) => void
}) {
  return (
    <>
      <div className="admin-header">
        <h2>Gestion des categories</h2>
        <button className="btn-add" onClick={onAdd}>
          Nouvelle categorie
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td style={{ color: 'var(--text-secondary)' }}>{cat.id}</td>
              <td>
                <strong>{cat.nom}</strong>
              </td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(cat)}>
                  Modifier
                </button>
                <button className="btn-delete" onClick={() => onDelete(cat)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td
                colSpan={3}
                style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
              >
                Aucune categorie.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}

function ClientsTab({
  clients,
  onAdd,
  onEdit,
  onDelete
}: {
  clients: Client[]
  onAdd: () => void
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
}) {
  return (
    <>
      <div className="admin-header">
        <h2>Gestion des clients fideles</h2>
        <button className="btn-add" onClick={onAdd}>
          Nouveau client
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td style={{ color: 'var(--text-secondary)' }}>{c.id}</td>
              <td>
                <strong>{c.nom}</strong>
              </td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(c)}>
                  Modifier
                </button>
                <button className="btn-delete" onClick={() => onDelete(c)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td
                colSpan={3}
                style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
              >
                Aucun client fidele.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}

function FournisseursTab({
  fournisseurs,
  onAdd,
  onEdit,
  onDelete
}: {
  fournisseurs: Fournisseur[]
  onAdd: () => void
  onEdit: (f: Fournisseur) => void
  onDelete: (f: Fournisseur) => void
}) {
  return (
    <>
      <div className="admin-header">
        <h2>Gestion des fournisseurs</h2>
        <button className="btn-add" onClick={onAdd}>
          Nouveau fournisseur
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Telephone</th>
            <th>Adresse</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fournisseurs.map((f) => (
            <tr key={f.id}>
              <td style={{ color: 'var(--text-secondary)' }}>{f.id}</td>
              <td>
                <strong>{f.nom}</strong>
              </td>
              <td>{f.telephone || '—'}</td>
              <td>{f.adresse || '—'}</td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(f)}>
                  Modifier
                </button>
                <button className="btn-delete" onClick={() => onDelete(f)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {fournisseurs.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
              >
                Aucun fournisseur.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}

function CategoryForm({
  category,
  onClose,
  onSaved
}: {
  category: Famille | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nom, setNom] = useState(category?.nom || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!category

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isEdit && category) {
        await window.api.updateCategory(category.id, nom.trim())
      } else {
        await window.api.addCategory(nom.trim())
      }
      onSaved()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Modifier la categorie' : 'Nouvelle categorie'}</h3>
        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom de la categorie</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
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

function ClientForm({
  client,
  onClose,
  onSaved
}: {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nom, setNom] = useState(client?.nom || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!client

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isEdit && client) {
        await window.api.updateClient(client.id, nom.trim())
      } else {
        await window.api.addClient(nom.trim())
      }
      onSaved()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Modifier le client' : 'Nouveau client fidele'}</h3>
        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du client</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
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

function FournisseurForm({
  fournisseur,
  onClose,
  onSaved
}: {
  fournisseur: Fournisseur | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nom, setNom] = useState(fournisseur?.nom || '')
  const [telephone, setTelephone] = useState(fournisseur?.telephone || '')
  const [adresse, setAdresse] = useState(fournisseur?.adresse || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!fournisseur

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = {
        nom: nom.trim(),
        telephone: telephone.trim() || undefined,
        adresse: adresse.trim() || undefined
      }
      if (isEdit && fournisseur) {
        await window.api.updateFournisseur({ id: fournisseur.id, ...data })
      } else {
        await window.api.addFournisseur(data)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du fournisseur</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Telephone</label>
            <input
              type="text"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <input
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
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

function TransfertTab({
  onNotify
}: {
  onNotify: (type: 'success' | 'error', msg: string) => void
}) {
  const [suggestions, setSuggestions] = useState<TransferSuggestion[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [search, setSearch] = useState('')

  const loadSuggestions = () => {
    setLoadingSuggestions(true)
    window.api.getTransferSuggestions(10, 20).then((data) => {
      setSuggestions(data)
      setLoadingSuggestions(false)
    })
  }

  const loadAllProducts = () => {
    window.api.getProducts().then(setAllProducts)
  }

  useEffect(() => {
    window.api.getTransferSuggestions(10, 20).then((data) => {
      setSuggestions(data)
      setLoadingSuggestions(false)
    })
    window.api.getProducts().then(setAllProducts)
  }, [])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!quantities.has(id)) {
          const product = allProducts.find((p) => p.id === id)
          if (product) {
            setQuantities((q) => new Map(q).set(id, product.stock_entrepot))
          }
        }
      }
      return next
    })
  }

  const updateQuantity = (id: number, qty: number) => {
    setQuantities((prev) => new Map(prev).set(id, Math.max(0, qty)))
  }

  const selectAll = () => {
    const available = allProducts.filter((p) => p.stock_entrepot > 0)
    const allSelected = available.every((p) => selectedIds.has(p.id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(available.map((p) => p.id))
      setSelectedIds(next)
      const newQty = new Map(quantities)
      for (const p of available) {
        if (!newQty.has(p.id)) newQty.set(p.id, p.stock_entrepot)
      }
      setQuantities(newQty)
    }
  }

  const handleTransferSuggested = async () => {
    if (suggestions.length === 0) return
    if (!confirm(`Transférer ${suggestions.length} produit(s) selon les suggestions ?`)) return
    setLoading(true)
    try {
      const items = suggestions.map((s) => ({ id: s.id, quantity: s.suggestedQty }))
      await window.api.transferStockBulk(items)
      onNotify('success', `${suggestions.length} produit(s) transféré(s)`)
      loadSuggestions()
      loadAllProducts()
      setSelectedIds(new Set())
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors du transfert'))
    } finally {
      setLoading(false)
    }
  }

  const handleBulkTransfer = async () => {
    if (selectedIds.size === 0) return
    const items: { id: number; quantity: number }[] = []
    for (const id of selectedIds) {
      const qty = quantities.get(id) || 0
      if (qty > 0) items.push({ id, quantity: qty })
    }
    if (items.length === 0) {
      onNotify('error', 'Aucune quantité définie')
      return
    }
    if (!confirm(`Transférer ${items.length} produit(s) de l'entrepôt vers la boutique ?`)) return
    setLoading(true)
    try {
      const result = await window.api.transferStockBulk(items)
      onNotify('success', `${result.transferred} produit(s) transféré(s) avec succès`)
      loadSuggestions()
      loadAllProducts()
      setSelectedIds(new Set())
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors du transfert'))
    } finally {
      setLoading(false)
    }
  }

  const totalSelected = Array.from(selectedIds).reduce(
    (sum, id) => sum + (quantities.get(id) || 0),
    0
  )

  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="admin-header">
        <h2>Transfert Entrepôt → Boutique</h2>
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              Suggestions de transfert (stock boutique {'<'} 10)
            </h3>
            <button
              className="btn-add"
              onClick={handleTransferSuggested}
              disabled={loading || loadingSuggestions}
              style={{ background: 'var(--brand-yellow)', color: 'var(--text-primary)' }}
            >
              {loading ? 'Transfert...' : `Transfert suggéré (${suggestions.length})`}
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Stock Boutique</th>
                <th>Stock Entrepôt</th>
                <th>Qty suggérée</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.stock_boutique}</td>
                  <td>{s.stock_entrepot}</td>
                  <td style={{ color: 'var(--accent, #f5b731)', fontWeight: 600 }}>
                    {s.suggestedQty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingSuggestions && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
          Chargement des suggestions...
        </div>
      )}

      {suggestions.length === 0 && !loadingSuggestions && (
        <div
          style={{
            textAlign: 'center',
            padding: 30,
            color: 'var(--text-secondary)',
            marginBottom: 24
          }}
        >
          Aucun produit en stock bas en boutique
        </div>
      )}

      <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Transfert en lot</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-edit" onClick={selectAll}>
              {allProducts.filter((p) => p.stock_entrepot > 0).every((p) => selectedIds.has(p.id))
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
            <button
              className="btn-add"
              onClick={handleBulkTransfer}
              disabled={loading || selectedIds.size === 0}
              style={{ background: 'var(--text-primary)', color: 'white' }}
            >
              {loading
                ? 'Transfert...'
                : `Transfert (${selectedIds.size} / ${totalSelected} unités)`}
            </button>
          </div>
        </div>

        <div className="cashier-search-panel" style={{ height: 'auto', marginBottom: 20 }}>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Produit</th>
              <th>Stock Boutique</th>
              <th>Stock Entrepôt</th>
              <th style={{ width: 120 }}>Qty à transférer</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const isLow = p.stock_boutique < 10
              const isSelected = selectedIds.has(p.id)
              return (
                <tr
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(245, 183, 49, 0.1)' : undefined
                  }}
                >
                  <td>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: '1.5px solid var(--border)',
                        background: isSelected ? 'var(--text-primary)' : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isSelected && (
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
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td
                    style={{
                      color: isLow ? 'var(--danger)' : 'var(--text-secondary)',
                      fontWeight: isLow ? 600 : 400
                    }}
                  >
                    {p.stock_boutique}
                  </td>
                  <td>{p.stock_entrepot}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      max={p.stock_entrepot}
                      value={isSelected ? quantities.get(p.id) || 0 : 0}
                      onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                      disabled={!isSelected}
                      style={{
                        width: 80,
                        padding: '6px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        fontSize: 13,
                        background: isSelected ? 'white' : 'var(--bg-card)'
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreditsTab({
  onNotify
}: {
  onNotify: (type: 'success' | 'error', msg: string) => void
}) {
  const [credits, setCredits] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [validatingId, setValidatingId] = useState<number | null>(null)
  const [validatedBy, setValidatedBy] = useState('')

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

  const handlePayCredit = async (saleId: number) => {
    if (!validatedBy.trim()) {
      onNotify('error', 'Le nom du validateur est requis')
      return
    }
    try {
      await window.api.payCredit(saleId, validatedBy.trim())
      onNotify('success', 'Crédit marqué comme payé')
      setValidatingId(null)
      setValidatedBy('')
      loadCredits()
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors de la validation'))
    }
  }

  const pendingCredits = credits.filter((c) => c.status === 'credit')
  const paidCredits = credits.filter((c) => c.status === 'paid' && c.paid_at)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Gestion des crédits</h2>
      </div>

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
                <th>Bénéfice</th>
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
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {sale.benefice.toLocaleString()} Ar
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
                        <input
                          type="text"
                          value={validatedBy}
                          onChange={(e) => setValidatedBy(e.target.value)}
                          placeholder="Validé par..."
                          style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            fontSize: 12,
                            width: 120
                          }}
                          autoFocus
                        />
                        <button
                          className="btn-add"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handlePayCredit(sale.id)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn-edit"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            setValidatingId(null)
                            setValidatedBy('')
                          }}
                        >
                          ✕
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
    </div>
  )
}
