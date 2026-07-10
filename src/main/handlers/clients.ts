import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerClientHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('clients:getAll', () => {
    return db.prepare('SELECT * FROM clients ORDER BY nom').all()
  })

  ipcMain.handle('clients:add', (_event, { nom }: { nom: string }) => {
    if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
    return db.prepare('INSERT INTO clients (nom) VALUES (?)').run(nom.trim())
  })

  ipcMain.handle('clients:update', (_event, { id, nom }: { id: number; nom: string }) => {
    if (!nom || nom.trim().length === 0) throw new Error('Le nom est requis')
    return db.prepare('UPDATE clients SET nom = ? WHERE id = ?').run(nom.trim(), id)
  })

  ipcMain.handle('clients:delete', (_event, id: number) => {
    db.prepare('UPDATE sales SET client_id = NULL WHERE client_id = ?').run(id)
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
    return { success: true }
  })
}
