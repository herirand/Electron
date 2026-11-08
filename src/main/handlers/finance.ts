import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

//  : helpers de date locale (fuseau du process = Indian/Antananarivo)
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

interface CaisseTotals {
  espece: number
  banque: number
  total: number
}

interface JournalRow {
  key: string
  date: string
  type: 'revenue' | 'depense'
  element: string
  montant: number
  ref_id: number | null
}

interface JournalResult {
  rows: JournalRow[]
  recettes: number
  depenses: number
}

//  : ligne d'historique des transferts vers la banque
interface DepotRow {
  id: number
  date: string
  montant: number
  created_by: string | null
}

//  : calcule les soldes globaux espèce / banque / total
function computeCaisse(db: Database.Database): CaisseTotals {
  const recettes = db
    .prepare(`SELECT COALESCE(SUM(total - remise), 0) as total FROM sales WHERE status = 'paid'`)
    .get() as { total: number }

  const depensesParMode = db
    .prepare(`SELECT mode, COALESCE(SUM(montant), 0) as total FROM depenses GROUP BY mode`)
    .all() as { mode: 'espece' | 'banque'; total: number }[]

  const depots = db.prepare(`SELECT COALESCE(SUM(montant), 0) as total FROM depots`).get() as {
    total: number
  }

  const apportsParMode = db
    .prepare(`SELECT mode, COALESCE(SUM(montant), 0) as total FROM apports_externes GROUP BY mode`)
    .all() as { mode: 'espece' | 'banque'; total: number }[]

  let depensesEspece = 0
  let depensesBanque = 0
  for (const d of depensesParMode) {
    if (d.mode === 'banque') depensesBanque += d.total
    else depensesEspece += d.total
  }

  let apportsEspece = 0
  let apportsBanque = 0
  for (const a of apportsParMode) {
    if (a.mode === 'banque') apportsBanque += a.total
    else apportsEspece += a.total
  }

  const espece = round2(recettes.total - depensesEspece - depots.total + apportsEspece)
  const banque = round2(depots.total - depensesBanque + apportsBanque)

  return { espece, banque, total: round2(espece + banque) }
}

//  : fige en base la recette de chaque journée terminée (une seule ligne par date)
export function syncRecettesJournalieres(
  db: Database.Database,
  today: string = localDate(new Date())
): void {
  db.prepare(
    `INSERT INTO recettes_journalieres (date, montant)
     SELECT date(COALESCE(paid_at, created_at)) as d,
            COALESCE(SUM(total - remise), 0) as total
     FROM sales
     WHERE status = 'paid'
       AND date(COALESCE(paid_at, created_at)) < ?
       AND date(COALESCE(paid_at, created_at)) > COALESCE(
         (SELECT MAX(date) FROM recettes_journalieres), ''
       )
     GROUP BY date(COALESCE(paid_at, created_at))
     ON CONFLICT(date) DO UPDATE SET montant = excluded.montant`
  ).run(today)
}

//  : rattrapage au démarrage + figement automatique à minuit
export function startFinanceScheduler(db: Database.Database): void {
  try {
    syncRecettesJournalieres(db)
  } catch (err) {
    console.error('Finance: échec du rattrapage des recettes journalières', err)
  }

  let currentDay = localDate(new Date())
  const timer = setInterval(() => {
    const today = localDate(new Date())
    if (today === currentDay) return
    currentDay = today
    try {
      syncRecettesJournalieres(db, today)
    } catch (err) {
      console.error('Finance: échec du figement des recettes journalières', err)
    }
  }, 30_000)
  timer.unref?.()
}

//  : journal mensuel = recettes journalières + dépenses (les transferts en sont exclus)
function getJournal(db: Database.Database, year: number, month: number): JournalResult {
  const startDate = `${year}-${pad2(month + 1)}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`

  //  : rattrape les journées terminées non encore figées
  syncRecettesJournalieres(db)

  const recettes = db
    .prepare(
      `SELECT date, montant
       FROM recettes_journalieres
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC`
    )
    .all(startDate, endDate) as { date: string; montant: number }[]

  //  : ligne du jour en direct, figée seulement au passage de minuit
  // (garde anti-doublon si la date du jour a déjà été figée)
  const today = localDate(new Date())
  const hasToday = recettes.some((r) => r.date === today)
  if (!hasToday && today >= startDate && today <= endDate) {
    const live = db
      .prepare(
        `SELECT COALESCE(SUM(total - remise), 0) as montant
         FROM sales
         WHERE status = 'paid' AND date(COALESCE(paid_at, created_at)) = ?`
      )
      .get(today) as { montant: number }
    if (live.montant > 0) recettes.push({ date: today, montant: live.montant })
  }

  const depenses = db
    .prepare(
      `SELECT id, date, motif, montant, mode
       FROM depenses
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC, id ASC`
    )
    .all(startDate, endDate) as {
    id: number
    date: string
    motif: string
    montant: number
    mode: 'espece' | 'banque'
  }[]

  const apports = db
    .prepare(
      `SELECT id, date, motif, montant, mode
       FROM apports_externes
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC, id ASC`
    )
    .all(startDate, endDate) as {
    id: number
    date: string
    motif: string
    montant: number
    mode: 'espece' | 'banque'
  }[]

  const rows = [
    ...recettes.map((r) => ({
      key: `revenue-${r.date}`,
      date: r.date,
      type: 'revenue' as const,
      element: 'Recette journalière',
      montant: round2(r.montant),
      ref_id: null
    })),
    ...apports.map((a) => ({
      key: `apport-${a.id}`,
      date: a.date,
      type: 'revenue' as const,
      element: `Apport externe: ${a.motif} (${a.mode === 'banque' ? 'banque' : 'espèces'})`,
      montant: round2(a.montant),
      ref_id: a.id
    })),
    ...depenses.map((d) => ({
      key: `depense-${d.id}`,
      date: d.date,
      type: 'depense' as const,
      element: `${d.motif} (${d.mode === 'banque' ? 'banque' : 'espèces'})`,
      montant: -round2(d.montant),
      ref_id: d.id
    }))
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    const order = { revenue: 0, depense: 1 }
    return order[a.type] - order[b.type]
  })

  const totalRecettes = rows.reduce((sum, r) => (r.type === 'revenue' ? sum + r.montant : sum), 0)
  const totalDepenses = rows.reduce((sum, r) => (r.type === 'depense' ? sum - r.montant : sum), 0)

  return {
    rows,
    recettes: round2(totalRecettes),
    depenses: round2(totalDepenses)
  }
}

//  : historique complet des transferts vers la banque
function getDepots(db: Database.Database): DepotRow[] {
  return db
    .prepare(
      `SELECT id, date, montant, created_by
       FROM depots
       ORDER BY date DESC, id DESC`
    )
    .all() as DepotRow[]
}

export function registerFinanceHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle(
    'finance:getJournal',
    (_event, { year, month }: { year: number; month: number }) => {
      return getJournal(db, year, month)
    }
  )

  ipcMain.handle('finance:getCaisse', () => {
    return computeCaisse(db)
  })

  ipcMain.handle('finance:getDepots', () => {
    return getDepots(db)
  })

  ipcMain.handle(
    'finance:addDepense',
    (
      _event,
      {
        motif,
        montant,
        mode,
        createdBy
      }: {
        motif: string
        montant: number
        mode: 'espece' | 'banque'
        createdBy?: string
      }
    ) => {
      const motifClean = String(motif || '').trim()
      const montantNum = round2(Number(montant))
      if (!motifClean) throw new Error('Le motif est requis')
      if (!Number.isFinite(montantNum) || montantNum <= 0)
        throw new Error('Le montant doit être un nombre positif')
      if (mode !== 'espece' && mode !== 'banque') throw new Error('Mode de paiement invalide')

      return db
        .prepare(
          `INSERT INTO depenses (date, motif, montant, mode, created_by)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(localDate(new Date()), motifClean, round2(montantNum), mode, createdBy || null)
    }
  )

  ipcMain.handle('finance:deleteDepense', (_event, id: number) => {
    //  : une dépense générée par un paiement fournisseur ne doit pas être supprimée à la main
    const linked = db.prepare('SELECT 1 FROM paiements_fournisseurs WHERE depense_id = ?').get(id)
    if (linked) {
      throw new Error('Dépense liée à un paiement fournisseur : suppression interdite')
    }

    const result = db.prepare('DELETE FROM depenses WHERE id = ?').run(id)
    if (result.changes === 0) throw new Error('Dépense introuvable')
    return { success: true }
  })

  ipcMain.handle(
    'finance:addApport',
    (
      _event,
      {
        motif,
        montant,
        mode,
        createdBy
      }: {
        motif: string
        montant: number
        mode: 'espece' | 'banque'
        createdBy?: string
      }
    ) => {
      const motifClean = String(motif || '').trim()
      const montantNum = round2(Number(montant))
      if (!motifClean) throw new Error('Le motif est requis')
      if (!Number.isFinite(montantNum) || montantNum <= 0)
        throw new Error('Le montant doit être un nombre positif')
      if (mode !== 'espece' && mode !== 'banque') throw new Error('Mode de paiement invalide')

      return db
        .prepare(
          `INSERT INTO apports_externes (date, motif, montant, mode, created_by)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(localDate(new Date()), motifClean, round2(montantNum), mode, createdBy || null)
    }
  )

  ipcMain.handle('finance:deleteApport', (_event, id: number) => {
    const result = db.prepare('DELETE FROM apports_externes WHERE id = ?').run(id)
    if (result.changes === 0) throw new Error('Apport introuvable')
    return { success: true }
  })

  ipcMain.handle(
    'finance:addDepot',
    (_event, { montant, createdBy }: { montant: number; createdBy?: string }) => {
      const montantNum = round2(Number(montant))
      if (!Number.isFinite(montantNum) || montantNum <= 0)
        throw new Error('Le montant doit être un nombre positif')

      //  : transaction pour vérifier le solde et insérer de façon atomique
      const depot = db.transaction(() => {
        const caisse = computeCaisse(db)
        if (montantNum > caisse.espece) {
          throw new Error(
            `Solde espèces insuffisant (${caisse.espece.toLocaleString()} Ar disponible)`
          )
        }
        db.prepare(`INSERT INTO depots (date, montant, created_by) VALUES (?, ?, ?)`).run(
          localDate(new Date()),
          round2(montantNum),
          createdBy || null
        )
      })

      depot()
      return { success: true }
    }
  )
}
