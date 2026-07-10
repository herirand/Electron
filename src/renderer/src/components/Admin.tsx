import { useState, useEffect, useMemo } from 'react'
import ProductForm from './ProductForm'
import UserForm from './UserForm'
import { getErrorMsg } from '../hooks/useApi'

type Tab = 'products' | 'users' | 'categories' | 'clients' | 'fournisseurs'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Famille[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [search, setSearch] = useState('')
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
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const loadProducts = () => window.api.getProducts().then(setProducts)
  const loadUsers = () => window.api.getUsers().then(setUsers)
  const loadCategories = () => window.api.getCategories().then(setCategories)
  const loadClients = () => window.api.getClients().then(setClients)
  const loadFournisseurs = () => window.api.getFournisseurs().then(setFournisseurs)

  useEffect(() => {
    loadProducts()
    loadUsers()
    loadCategories()
    loadClients()
    loadFournisseurs()
  }, [])

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

          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Boutique</th>
                <th>Entrepôt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{product.id}</td>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{product.famille_nom || '—'}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {product.price.toLocaleString()} Ar
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
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
                  >
                    Aucun produit. Cliquez sur "Nouveau produit" pour commencer.
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
