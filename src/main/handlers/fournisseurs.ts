import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerFournisseurHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('fournisseurs:getAll', () => {
    return db.prepare('SELECT * FROM fournisseurs ORDER BY nom').all()
  })

  ipcMain.handle(
    'fournisseurs:add',
    (
      _event,
      { nom, telephone, adresse }: { nom: string; telephone?: string; adresse?: string }
    ) => {
      if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
      return db
        .prepare('INSERT INTO fournisseurs (nom, telephone, adresse) VALUES (?, ?, ?)')
        .run(nom.trim(), telephone || null, adresse || null)
    }
  )

  ipcMain.handle(
    'fournisseurs:update',
    (
      _event,
      {
        id,
        nom,
        telephone,
        adresse
      }: { id: number; nom: string; telephone?: string; adresse?: string }
    ) => {
      if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
      return db
        .prepare('UPDATE fournisseurs SET nom = ?, telephone = ?, adresse = ? WHERE id = ?')
        .run(nom.trim(), telephone || null, adresse || null, id)
    }
  )

  ipcMain.handle('fournisseurs:delete', (_event, id: number) => {
    db.prepare('DELETE FROM fournisseur_produits WHERE fournisseur_id = ?').run(id)
    db.prepare('DELETE FROM fournisseurs WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('fournisseur-produits:getByFournisseur', (_event, fournisseurId: number) => {
    return db
      .prepare(
        `SELECT fp.id, fp.produit_id, p.name as produit_nom
         FROM fournisseur_produits fp
         JOIN products p ON p.id = fp.produit_id
         WHERE fp.fournisseur_id = ?
         ORDER BY p.name`
      )
      .all(fournisseurId)
  })

  ipcMain.handle(
    'fournisseur-produits:sync',
    (_event, { fournisseurId, produitIds }: { fournisseurId: number; produitIds: number[] }) => {
      db.transaction(() => {
        db.prepare('DELETE FROM fournisseur_produits WHERE fournisseur_id = ?').run(fournisseurId)
        const insert = db.prepare(
          'INSERT INTO fournisseur_produits (fournisseur_id, produit_id) VALUES (?, ?)'
        )
        for (const pid of produitIds) {
          insert.run(fournisseurId, pid)
        }
      })()
      return { success: true }
    }
  )
}
