import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerCategoryHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('categories:getAll', () => {
    return db.prepare('SELECT * FROM familles ORDER BY nom').all()
  })

  ipcMain.handle('categories:add', (_event, { nom }: { nom: string }) => {
    if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
    try {
      return db.prepare('INSERT INTO familles (nom) VALUES (?)').run(nom.trim())
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint'))
        throw new Error('Cette catégorie existe déjà')
      throw err
    }
  })

  ipcMain.handle('categories:update', (_event, { id, nom }: { id: number; nom: string }) => {
    if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
    try {
      return db.prepare('UPDATE familles SET nom = ? WHERE id = ?').run(nom.trim(), id)
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint'))
        throw new Error('Cette catégorie existe déjà')
      throw err
    }
  })

  ipcMain.handle('categories:delete', (_event, id: number) => {
    const count = db
      .prepare('SELECT COUNT(*) as cnt FROM products WHERE famille_id = ?')
      .get(id) as { cnt: number }
    if (count.cnt > 0)
      throw new Error('Impossible de supprimer : des produits utilisent cette catégorie')
    db.prepare('DELETE FROM familles WHERE id = ?').run(id)
    return { success: true }
  })
}
