import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getErrorMsg } from '../hooks/useApi'

// NOUVEAU : noms des mois pour le sélecteur de période
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
]

// NOUVEAU : formatage dd/mm/yyyy sans new Date() pour éviter les décalages de fuseau
function formatDate(date: string): string {
  const parts = date.split('-')
  if (parts.length !== 3) return date
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// NOUVEAU : formatage des montants en Ariary
function formatMontant(value: number): string {
  return `${value.toLocaleString()} Ar`
}

type ModalKind = 'expense' | 'depot'

interface FinanceProps {
  user: User
}

// NOUVEAU : page Finance (journal, caisse, dépenses et dépôts)
export default function Finance({ user }: FinanceProps): React.JSX.Element {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [journal, setJournal] = useState<FinanceJournal | null>(null)
  const [caisse, setCaisse] = useState<FinanceCaisse | null>(null)
  const [depots, setDepots] = useState<FinanceDepot[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind | null>(null)
  const [tab, setTab] = useState<'journal' | 'transfert'>('journal')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // NOUVEAU : toast local avec auto-hide
  const showToast = useCallback((type: 'success' | 'error', msg: string): void => {
    clearTimeout(toastTimer.current)
    setToast({ type, msg })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // NOUVEAU : chargement parallèle du journal, de la caisse et des transferts
  const fetchAll = useCallback(
    (): Promise<[FinanceJournal, FinanceCaisse, FinanceDepot[]]> =>
      // MODIFIÉ : l'API attend un mois 0-based, alors que l'état local est 1-based
      Promise.all([
        window.api.getFinanceJournal(year, month - 1),
        window.api.getFinanceCaisse(),
        window.api.getFinanceDepots()
      ]),
    [year, month]
  )

  // NOUVEAU : chargement annulable pour éviter les écrasements lors d'un changement de mois
  useEffect(() => {
    let active = true
    const load = async (): Promise<void> => {
      setLoading(true)
      try {
        const [nextJournal, nextCaisse, nextDepots] = await fetchAll()
        if (!active) return
        setJournal(nextJournal)
        setCaisse(nextCaisse)
        setDepots(nextDepots)
      } catch (err) {
        if (active) showToast('error', getErrorMsg(err, 'Erreur lors du chargement'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [fetchAll, showToast])

  // NOUVEAU : rechargement unique (journal + caisse) après une action
  const reloadData = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [nextJournal, nextCaisse, nextDepots] = await fetchAll()
      setJournal(nextJournal)
      setCaisse(nextCaisse)
      setDepots(nextDepots)
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
  }, [fetchAll, showToast])

  // NOUVEAU : bascule automatique au passage de minuit même si la page reste ouverte
  const lastDayRef = useRef(new Date().toDateString())
  useEffect(() => {
    const timer = setInterval(() => {
      const nextDay = new Date().toDateString()
      if (nextDay === lastDayRef.current) return
      lastDayRef.current = nextDay
      void reloadData()
    }, 60_000)
    return () => clearInterval(timer)
  }, [reloadData])

  const rows = useMemo(() => journal?.rows ?? [], [journal])
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  const changeMonth = (delta: number): void => {
    const date = new Date(year, month - 1 + delta, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
  }

  // NOUVEAU : sections Journal et Transfert séparées, avec rafraîchissement au changement
  const switchTab = (next: 'journal' | 'transfert'): void => {
    if (next === tab) return
    setTab(next)
    void reloadData()
  }

  const handleSaved = async (msg: string): Promise<void> => {
    setModal(null)
    await reloadData()
    showToast('success', msg)
  }

  const handleDeleteDepense = async (row: FinanceJournalRow): Promise<void> => {
    if (row.ref_id === null) return
    if (!confirm('Supprimer cette dépense ?')) return
    try {
      await window.api.deleteFinanceDepense(row.ref_id)
      await reloadData()
      showToast('success', 'Dépense supprimée')
    } catch (err) {
      showToast('error', getErrorMsg(err, 'Erreur lors de la suppression'))
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Finance</h2>
        {tab === 'journal' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="calendar-nav-btn"
              onClick={() => changeMonth(-1)}
              disabled={loading}
              aria-label="Mois précédent"
            >
              ←
            </button>
            <span className="calendar-nav-title">{monthLabel}</span>
            <button
              className="calendar-nav-btn"
              onClick={() => changeMonth(1)}
              disabled={loading}
              aria-label="Mois suivant"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'journal' ? 'active' : ''}`}
          onClick={() => switchTab('journal')}
        >
          📒 Journal
        </button>
        <button
          className={`admin-tab ${tab === 'transfert' ? 'active' : ''}`}
          onClick={() => switchTab('transfert')}
        >
          🏦 Transfert
        </button>
      </div>

      {tab === 'journal' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Transactions du mois</h3>
            <button className="btn-add" onClick={() => setModal('expense')}>
              Nouvelle dépense
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Élément</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isDepense = row.type === 'depense'
                return (
                  <tr key={row.key}>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(row.date)}</td>
                    <td>{row.element}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isDepense ? (
                        <span className="finance-amount-expense">{formatMontant(row.montant)}</span>
                      ) : (
                        formatMontant(row.montant)
                      )}
                      {isDepense && row.ref_id !== null && (
                        <button
                          className="btn-delete"
                          style={{ marginLeft: 10, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDeleteDepense(row)}
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Aucune transaction pour ce mois.
                  </td>
                </tr>
              )}
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Chargement...
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="finance-summary">
            <span>
              Recettes du mois :{' '}
              <strong style={{ color: 'var(--success)' }}>
                {formatMontant(journal?.recettes ?? 0)}
              </strong>
            </span>
            <span>
              Dépenses du mois :{' '}
              <strong style={{ color: 'var(--danger)' }}>
                {formatMontant(journal?.depenses ?? 0)}
              </strong>
            </span>
          </div>
        </>
      )}

      {tab === 'transfert' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Soldes disponibles</h3>
            <button
              className="btn-add"
              onClick={() => setModal('depot')}
              disabled={loading || (caisse?.espece ?? 0) <= 0}
            >
              Dépôt
            </button>
          </div>

          <div className="finance-cards">
            <div className="finance-card">
              <div className="finance-card-label">Espèce</div>
              <div className="finance-card-value">{formatMontant(caisse?.espece ?? 0)}</div>
            </div>
            <div className="finance-card">
              <div className="finance-card-label">Banque</div>
              <div className="finance-card-value">{formatMontant(caisse?.banque ?? 0)}</div>
            </div>
            <div className="finance-card highlight">
              <div className="finance-card-label">Total</div>
              <div className="finance-card-value">{formatMontant(caisse?.total ?? 0)}</div>
            </div>
          </div>

          <div className="admin-header" style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              Historique des transferts
            </h3>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Montant</th>
                <th>Enregistré par</th>
              </tr>
            </thead>
            <tbody>
              {depots.map((depot) => (
                <tr key={depot.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(depot.date)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="finance-amount-depot">{formatMontant(depot.montant)}</span>
                  </td>
                  <td>{depot.created_by || '—'}</td>
                </tr>
              ))}
              {!loading && depots.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Aucun transfert enregistré.
                  </td>
                </tr>
              )}
              {loading && depots.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Chargement...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {modal === 'expense' && (
        <ExpenseModal user={user} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal === 'depot' && (
        <DepositModal
          user={user}
          soldeEspece={caisse?.espece ?? 0}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

// NOUVEAU : modale de création d'une dépense
function ExpenseModal({
  user,
  onClose,
  onSaved
}: {
  user: User
  onClose: () => void
  onSaved: (msg: string) => void
}): React.JSX.Element {
  const [motif, setMotif] = useState('')
  const [montant, setMontant] = useState('')
  const [mode, setMode] = useState<'espece' | 'banque'>('espece')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (loading) return
    const value = Number(montant)
    if (!motif.trim()) {
      setError('Le motif est obligatoire.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Le montant doit être supérieur à 0.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await window.api.addFinanceDepense({
        motif: motif.trim(),
        montant: value,
        mode,
        createdBy: user.username
      })
      onSaved('Dépense enregistrée')
    } catch (err) {
      setError(getErrorMsg(err, "Erreur lors de l'enregistrement"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouvelle dépense</h3>
        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Motif</label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Montant (Ar)</label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              min={1}
              step={1}
              required
            />
          </div>
          <div className="form-group">
            <label>Mode de paiement</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'espece' | 'banque')}>
              <option value="espece">Espèce</option>
              <option value="banque">Banque</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// NOUVEAU : modale de dépôt vers la caisse
function DepositModal({
  user,
  soldeEspece,
  onClose,
  onSaved
}: {
  user: User
  soldeEspece: number
  onClose: () => void
  onSaved: (msg: string) => void
}): React.JSX.Element {
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (loading) return
    const value = Number(montant)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Le montant doit être supérieur à 0.')
      return
    }
    if (value > soldeEspece) {
      setError('Le montant ne peut pas dépasser le solde espèce.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await window.api.addFinanceDepot({ montant: value, createdBy: user.username })
      onSaved('Dépôt enregistré')
    } catch (err) {
      setError(getErrorMsg(err, "Erreur lors de l'enregistrement"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouveau dépôt</h3>
        <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
          Solde espèce disponible : <strong>{formatMontant(soldeEspece)}</strong>
        </p>
        {error && (
          <div className="error-msg" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Montant (Ar)</label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              min={1}
              max={soldeEspece}
              step={1}
              autoFocus
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
