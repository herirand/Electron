import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

// NOUVEAU : filtres de la liste des livraisons fournisseurs
interface LivraisonFilters {
  fournisseurId?: number
  statut?: 'impayee' | 'payee'
  enRetard?: boolean
  dateFrom?: string
  dateTo?: string
}

interface LivraisonPayload {
  id?: number
  fournisseurId: number
  montant: number
  reference?: string
  dateLivraison?: string
  dateEcheance?: string
  createdBy?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// NOUVEAU : dates locales (fuseau du process = Indian/Antananarivo)
function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function localDateTime(d: Date): string {
  return `${localDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseMontant(value: number): number {
  const montant = round2(Number(value))
  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error('Le montant doit être un nombre positif')
  }
  return montant
}

function normalizeDates(
  dateLivraisonRaw?: string,
  dateEcheanceRaw?: string
): { dateLivraison: string; dateEcheance: string | null } {
  const dateLivraison = (dateLivraisonRaw || '').trim() || localDate(new Date())
  if (!isValidDate(dateLivraison)) throw new Error('Date de livraison invalide')
  const dateEcheance = (dateEcheanceRaw || '').trim() || null
  if (dateEcheance && !isValidDate(dateEcheance)) throw new Error("Date d'échéance invalide")
  if (dateEcheance && dateEcheance < dateLivraison) {
    throw new Error("La date d'échéance ne peut pas précéder la date de livraison")
  }
  return { dateLivraison, dateEcheance }
}

function assertFournisseur(db: Database.Database, fournisseurId: number): void {
  const row = db.prepare('SELECT id FROM fournisseurs WHERE id = ?').get(fournisseurId)
  if (!row) throw new Error('Fournisseur introuvable')
}

// NOUVEAU : service complet livraisons / paiement fournisseur
export function registerLivraisonHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('livraisons:getAll', (_event, filters: LivraisonFilters = {}) => {
    const where: string[] = []
    const params: (string | number)[] = []

    if (filters.fournisseurId) {
      where.push('l.fournisseur_id = ?')
      params.push(filters.fournisseurId)
    }
    if (filters.statut === 'impayee' || filters.statut === 'payee') {
      where.push('l.statut = ?')
      params.push(filters.statut)
    }
    if (filters.enRetard) {
      where.push("l.statut = 'impayee' AND l.date_echeance IS NOT NULL AND l.date_echeance < ?")
      params.push(localDate(new Date()))
    }
    if (filters.dateFrom) {
      where.push('l.date_livraison >= ?')
      params.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      where.push('l.date_livraison <= ?')
      params.push(filters.dateTo)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    return db
      .prepare(
        `SELECT l.*, f.nom AS fournisseur_nom,
           CASE
             WHEN l.statut = 'impayee' AND l.date_echeance IS NOT NULL AND l.date_echeance < ?
             THEN 1 ELSE 0
           END AS en_retard
         FROM livraisons l
         JOIN fournisseurs f ON f.id = l.fournisseur_id
         ${whereSql}
         ORDER BY
           CASE WHEN l.statut = 'impayee' THEN 0 ELSE 1 END,
           l.date_echeance IS NULL,
           l.date_echeance ASC,
           l.date_livraison DESC,
           l.id DESC`
      )
      .all(localDate(new Date()), ...params)
  })

  ipcMain.handle('livraisons:getStats', () => {
    const today = localDate(new Date())
    const monthStart = `${today.slice(0, 7)}-01`

    const row = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN statut = 'impayee' THEN montant ELSE 0 END), 0) AS total_impaye,
           COALESCE(SUM(CASE WHEN statut = 'impayee' AND date_echeance IS NOT NULL AND date_echeance < ? THEN montant ELSE 0 END), 0) AS total_en_retard,
           COALESCE(SUM(CASE WHEN statut = 'impayee' THEN 1 ELSE 0 END), 0) AS nb_impayees,
           COALESCE(SUM(CASE WHEN statut = 'impayee' AND date_echeance IS NOT NULL AND date_echeance < ? THEN 1 ELSE 0 END), 0) AS nb_en_retard,
           COALESCE(SUM(CASE WHEN statut = 'payee' AND paid_at IS NOT NULL AND date(paid_at) >= ? THEN montant ELSE 0 END), 0) AS payees_mois
         FROM livraisons`
      )
      .get(today, today, monthStart) as {
      total_impaye: number
      total_en_retard: number
      nb_impayees: number
      nb_en_retard: number
      payees_mois: number
    }

    return {
      totalImpaye: round2(row.total_impaye),
      totalEnRetard: round2(row.total_en_retard),
      nbImpayees: row.nb_impayees,
      nbEnRetard: row.nb_en_retard,
      payeesMois: round2(row.payees_mois)
    }
  })

  ipcMain.handle('livraisons:add', (_event, payload: LivraisonPayload) => {
    const fournisseurId = Number(payload.fournisseurId)
    if (!Number.isInteger(fournisseurId) || fournisseurId <= 0) {
      throw new Error('Fournisseur invalide')
    }
    assertFournisseur(db, fournisseurId)

    const montant = parseMontant(payload.montant)
    const { dateLivraison, dateEcheance } = normalizeDates(
      payload.dateLivraison,
      payload.dateEcheance
    )
    const reference = (payload.reference || '').trim() || null
    const createdBy = (payload.createdBy || '').trim() || null

    return db
      .prepare(
        `INSERT INTO livraisons
           (fournisseur_id, montant, reference, date_livraison, date_echeance, statut, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'impayee', ?, ?)`
      )
      .run(
        fournisseurId,
        montant,
        reference,
        dateLivraison,
        dateEcheance,
        createdBy,
        localDateTime(new Date())
      )
  })

  ipcMain.handle('livraisons:update', (_event, payload: LivraisonPayload) => {
    const id = Number(payload.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Livraison invalide')

    const existing = db.prepare('SELECT statut FROM livraisons WHERE id = ?').get(id) as
      | { statut: 'impayee' | 'payee' }
      | undefined
    if (!existing) throw new Error('Livraison introuvable')
    if (existing.statut === 'payee') {
      throw new Error('Une livraison payée ne peut plus être modifiée')
    }

    const fournisseurId = Number(payload.fournisseurId)
    if (!Number.isInteger(fournisseurId) || fournisseurId <= 0) {
      throw new Error('Fournisseur invalide')
    }
    assertFournisseur(db, fournisseurId)

    const montant = parseMontant(payload.montant)
    const { dateLivraison, dateEcheance } = normalizeDates(
      payload.dateLivraison,
      payload.dateEcheance
    )
    const reference = (payload.reference || '').trim() || null

    const result = db
      .prepare(
        `UPDATE livraisons
         SET fournisseur_id = ?, montant = ?, reference = ?, date_livraison = ?, date_echeance = ?
         WHERE id = ? AND statut = 'impayee'`
      )
      .run(fournisseurId, montant, reference, dateLivraison, dateEcheance, id)

    if (result.changes === 0) throw new Error('Livraison introuvable ou déjà payée')
    return result
  })

  ipcMain.handle('livraisons:delete', (_event, idRaw: number) => {
    const id = Number(idRaw)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Livraison invalide')

    const result = db.prepare("DELETE FROM livraisons WHERE id = ? AND statut = 'impayee'").run(id)
    if (result.changes === 0) {
      throw new Error('Livraison introuvable ou déjà payée (suppression interdite)')
    }
    return { success: true }
  })

  // NOUVEAU : paiement total + sortie de caisse dans une transaction atomique
  ipcMain.handle(
    'livraisons:payer',
    (_event, payload: { id: number; mode?: 'espece' | 'banque'; paidBy?: string }) => {
      const id = Number(payload.id)
      if (!Number.isInteger(id) || id <= 0) throw new Error('Livraison invalide')

      const mode: 'espece' | 'banque' = payload.mode === 'banque' ? 'banque' : 'espece'
      const paidBy = (payload.paidBy || '').trim() || null

      const pay = db.transaction(() => {
        const livraison = db
          .prepare(
            `SELECT l.id, l.fournisseur_id, l.montant, l.statut, f.nom AS fournisseur_nom
             FROM livraisons l
             JOIN fournisseurs f ON f.id = l.fournisseur_id
             WHERE l.id = ?`
          )
          .get(id) as
          | {
              id: number
              fournisseur_id: number
              montant: number
              statut: 'impayee' | 'payee'
              fournisseur_nom: string
            }
          | undefined

        if (!livraison) throw new Error('Livraison introuvable')
        if (livraison.statut === 'payee') throw new Error('Cette livraison est déjà payée')

        const montant = round2(livraison.montant)
        const now = localDateTime(new Date())

        const depense = db
          .prepare(
            `INSERT INTO depenses (date, motif, montant, mode, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(
            localDate(new Date()),
            `Paiement fournisseur ${livraison.fournisseur_nom} - Livraison #${livraison.id}`,
            montant,
            mode,
            paidBy,
            now
          )

        db.prepare(
          `INSERT INTO paiements_fournisseurs
             (livraison_id, fournisseur_id, montant, mode, depense_id, paid_at, paid_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          livraison.id,
          livraison.fournisseur_id,
          montant,
          mode,
          depense.lastInsertRowid,
          now,
          paidBy
        )

        db.prepare(
          `UPDATE livraisons SET statut = 'payee', paid_at = ?, paid_by = ?
           WHERE id = ? AND statut = 'impayee'`
        ).run(now, paidBy, id)

        return { success: true, depenseId: Number(depense.lastInsertRowid) }
      })

      return pay()
    }
  )

  ipcMain.handle(
    'livraisons:getPaiements',
    (_event, filters: { fournisseurId?: number; dateFrom?: string; dateTo?: string } = {}) => {
      const where: string[] = []
      const params: (string | number)[] = []

      if (filters.fournisseurId) {
        where.push('p.fournisseur_id = ?')
        params.push(filters.fournisseurId)
      }
      if (filters.dateFrom) {
        where.push('date(p.paid_at) >= ?')
        params.push(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.push('date(p.paid_at) <= ?')
        params.push(filters.dateTo)
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

      return db
        .prepare(
          `SELECT p.*, f.nom AS fournisseur_nom, l.reference, l.date_livraison
           FROM paiements_fournisseurs p
           JOIN fournisseurs f ON f.id = p.fournisseur_id
           JOIN livraisons l ON l.id = p.livraison_id
           ${whereSql}
           ORDER BY p.paid_at DESC, p.id DESC`
        )
        .all(...params)
    }
  )
}
