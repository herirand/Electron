import { useState, useEffect, useCallback } from 'react'
import { getErrorMsg } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'

function todayLocal(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const part = value.split(' ')[0]
  const parts = part.split('-')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

function LivraisonForm({
  livraison,
  fournisseurs,
  onClose,
  onSaved
}: {
  livraison: Livraison | null
  fournisseurs: Fournisseur[]
  onClose: () => void
  onSaved: () => void
}) {
  const today = todayLocal()
  const [fournisseurId, setFournisseurId] = useState<string>(
    livraison ? String(livraison.fournisseur_id) : fournisseurs[0] ? String(fournisseurs[0].id) : ''
  )
  const [montant, setMontant] = useState<string>(livraison ? String(livraison.montant) : '')
  const [reference, setReference] = useState<string>(livraison?.reference || '')
  const [dateLivraison, setDateLivraison] = useState<string>(livraison?.date_livraison || today)
  const [dateEcheance, setDateEcheance] = useState<string>(livraison?.date_echeance || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const montantNum = Number(montant)
    if (!fournisseurId) {
      setError('Veuillez sélectionner un fournisseur')
      return
    }
    if (isNaN(montantNum) || montantNum <= 0) {
      setError('Le montant doit être supérieur à 0')
      return
    }
    setLoading(true)
    try {
      if (livraison) {
        await window.api.updateLivraison({
          id: livraison.id,
          fournisseurId: Number(fournisseurId),
          montant: montantNum,
          reference: reference.trim() || undefined,
          dateLivraison: dateLivraison || undefined,
          dateEcheance: dateEcheance || undefined
        })
      } else {
        await window.api.addLivraison({
          fournisseurId: Number(fournisseurId),
          montant: montantNum,
          reference: reference.trim() || undefined,
          dateLivraison: dateLivraison || undefined,
          dateEcheance: dateEcheance || undefined
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMsg(err, "Erreur lors de l'enregistrement"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{livraison ? 'Modifier la livraison' : 'Nouvelle livraison'}</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Fournisseur *</label>
            <select
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              required
            >
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Montant *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Référence</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date livraison</label>
            <input
              type="date"
              value={dateLivraison}
              onChange={(e) => setDateLivraison(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Date d&apos;échéance</label>
            <input
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !fournisseurId}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PayerModal({
  livraison,
  onClose,
  onPaid
}: {
  livraison: Livraison
  onClose: () => void
  onPaid: () => void
}) {
  const [mode, setMode] = useState<'espece' | 'banque'>('espece')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    setError('')
    setLoading(true)
    try {
      await window.api.payerLivraison({ id: livraison.id, mode })
      onPaid()
      onClose()
    } catch (err) {
      setError(getErrorMsg(err, 'Erreur lors du paiement'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Payer la livraison</h3>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <div>
            <strong>Fournisseur:</strong> {livraison.fournisseur_nom}
          </div>
          <div>
            <strong>Référence:</strong> {livraison.reference || '—'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
            {livraison.montant.toLocaleString()} Ar
          </div>
        </div>
        <div className="form-group">
          <label>Mode de paiement</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'espece' | 'banque')}>
            <option value="espece">Espèces</option>
            <option value="banque">Banque</option>
          </select>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
          Le paiement sera enregistré comme sortie de caisse.
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="button" className="btn-primary" onClick={handlePay} disabled={loading}>
            {loading ? 'Paiement...' : `Payer ${livraison.montant.toLocaleString()} Ar`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LivraisonsTab({
  onNotify
}: {
  onNotify: (type: 'success' | 'error', msg: string) => void
}) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [stats, setStats] = useState<LivraisonStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [fournisseurFilter, setFournisseurFilter] = useState<string>('all')
  const [statutFilter, setStatutFilter] = useState<string>('all')
  const [enRetardOnly, setEnRetardOnly] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  const [showForm, setShowForm] = useState(false)
  const [editingLivraison, setEditingLivraison] = useState<Livraison | null>(null)
  const [payingLivraison, setPayingLivraison] = useState<Livraison | null>(null)

  const loadAll = useCallback(async () => {
    // NOUVEAU : chargement indépendant — un échec livraisons ne masque plus les fournisseurs
    try {
      setFournisseurs(await window.api.getFournisseurs())
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors du chargement des fournisseurs'))
    }

    try {
      const [lList, s] = await Promise.all([
        window.api.getLivraisons(),
        window.api.getLivraisonStats()
      ])
      setLivraisons(lList)
      setStats(s)
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors du chargement des livraisons'))
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filtered = livraisons.filter((l) => {
    if (fournisseurFilter !== 'all' && String(l.fournisseur_id) !== fournisseurFilter) return false
    if (statutFilter === 'impayee' && l.statut !== 'impayee') return false
    if (statutFilter === 'payee' && l.statut !== 'payee') return false
    if (enRetardOnly && l.en_retard !== 1) return false
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      const refMatch = (l.reference || '').toLowerCase().includes(q)
      const nomMatch = (l.fournisseur_nom || '').toLowerCase().includes(q)
      if (!refMatch && !nomMatch) return false
    }
    return true
  })

  const handleDelete = async (l: Livraison) => {
    if (!confirm('Supprimer cette livraison ?')) return
    try {
      await window.api.deleteLivraison(l.id)
      onNotify('success', 'Livraison supprimée')
      loadAll()
    } catch (err) {
      onNotify('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  const handlePaid = () => {
    onNotify('success', 'Paiement enregistré')
    loadAll()
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Livraisons fournisseurs</h2>
        <button
          className="btn-add"
          onClick={() => {
            setEditingLivraison(null)
            setShowForm(true)
          }}
        >
          Nouvelle livraison
        </button>
      </div>

      <div className="finance-cards">
        <div className="finance-card highlight">
          <div className="finance-card-label">Total impayé</div>
          <div className="finance-card-value">{(stats?.totalImpaye || 0).toLocaleString()} Ar</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
            {stats?.nbImpayees || 0} livraison(s)
          </div>
        </div>
        <div className="finance-card">
          <div className="finance-card-label">En retard</div>
          <div className="finance-card-value">
            {(stats?.totalEnRetard || 0).toLocaleString()} Ar
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
            {stats?.nbEnRetard || 0} en retard
          </div>
        </div>
        <div className="finance-card">
          <div className="finance-card-label">Payées ce mois</div>
          <div className="finance-card-value">{(stats?.payeesMois || 0).toLocaleString()} Ar</div>
        </div>
      </div>

      <div className="livraisons-filters">
        <select value={fournisseurFilter} onChange={(e) => setFournisseurFilter(e.target.value)}>
          <option value="all">Tous les fournisseurs</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          <option value="impayee">Impayées</option>
          <option value="payee">Payées</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={enRetardOnly}
            onChange={(e) => setEnRetardOnly(e.target.checked)}
          />
          En retard uniquement
        </label>
        <input
          type="text"
          placeholder="Référence ou fournisseur"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Fournisseur</th>
            <th>Référence</th>
            <th>Date livraison</th>
            <th>Échéance</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>
                Chargement...
              </td>
            </tr>
          )}
          {!loading &&
            filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.fournisseur_nom}</td>
                <td>{l.reference || '—'}</td>
                <td>{formatDate(l.date_livraison)}</td>
                <td>{formatDate(l.date_echeance)}</td>
                <td style={{ fontWeight: 700 }}>{l.montant.toLocaleString()} Ar</td>
                <td>
                  {l.statut === 'payee' ? (
                    <span className="livraison-badge paid">Payée</span>
                  ) : l.en_retard === 1 ? (
                    <span className="livraison-badge late">En retard</span>
                  ) : (
                    <span className="livraison-badge unpaid">Impayée</span>
                  )}
                </td>
                <td>
                  {l.statut === 'impayee' ? (
                    <>
                      <button className="btn-pay" onClick={() => setPayingLivraison(l)}>
                        Payer
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => {
                          setEditingLivraison(l)
                          setShowForm(true)
                        }}
                      >
                        Modifier
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(l)}>
                        Supprimer
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {l.paid_at ? formatDate(l.paid_at) : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          {!loading && filtered.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}
              >
                Aucune livraison.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <LivraisonForm
          livraison={editingLivraison}
          fournisseurs={fournisseurs}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            onNotify('success', editingLivraison ? 'Livraison modifiée' : 'Livraison ajoutée')
            loadAll()
          }}
        />
      )}
      {payingLivraison && (
        <PayerModal
          livraison={payingLivraison}
          onClose={() => setPayingLivraison(null)}
          onPaid={handlePaid}
        />
      )}
    </div>
  )
}
