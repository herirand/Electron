import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerDbHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('db:reset', () => {
    db.transaction(() => {
      db.exec('DELETE FROM sale_items')
      db.exec('DELETE FROM sales')
      db.exec('DELETE FROM products')
      db.exec(`
        INSERT OR IGNORE INTO products (name, price, quantity) VALUES
          ('Riz 5kg', 4500, 50),
          ('Sucre 1kg', 3000, 30),
          ('Huile 1L', 8000, 20),
          ('Lait 1L', 3500, 15),
          ('Savon', 1500, 40)
      `)
    })()
    return { success: true }
  })
}
