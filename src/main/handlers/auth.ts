import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { hashPassword } from '../database'

export function registerAuthHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('auth:login', (_event, { username, password }) => {
    const user = db
      .prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?')
      .get(username, hashPassword(password)) as
      | { id: number; username: string; role: 'admin' | 'cashier' }
      | undefined
    if (!user) {
      throw new Error('Identifiants incorrects')
    }
    return user
  })

  ipcMain.handle('auth:signup', (_event, { username, password }) => {
    if (!username || username.length < 2)
      throw new Error("Le nom d'utilisateur doit faire au moins 2 caractères")
    if (!password || password.length < 4)
      throw new Error('Le mot de passe doit faire au moins 4 caractères')
    try {
      return db
        .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run(username, hashPassword(password), 'cashier')
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint'))
        throw new Error("Ce nom d'utilisateur existe déjà")
      throw err
    }
  })

  ipcMain.handle('users:getAll', () => {
    return db.prepare('SELECT id, username, role FROM users ORDER BY role, username').all()
  })

  ipcMain.handle('users:delete', (_event, id: number) => {
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id) as
      | { id: number; role: string }
      | undefined
    if (!user) throw new Error('Utilisateur introuvable')
    if (user.role === 'admin') throw new Error('Impossible de supprimer un administrateur')
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return { success: true }
  })
}
