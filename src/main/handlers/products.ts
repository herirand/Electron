import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

const LIST_COLUMNS = `p.id, p.name, p.price, p.purchase_price, p.famille_id, p.stock_boutique, p.stock_entrepot, p.code_barre, f.nom as famille_nom`

export function registerProductHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('products:getAll', () => {
    return db
      .prepare(
        `SELECT ${LIST_COLUMNS}
         FROM products p
         LEFT JOIN familles f ON f.id = p.famille_id
         ORDER BY p.name`
      )
      .all()
  })

  ipcMain.handle(
    'products:add',
    (
      _event,
      {
        name,
        price,
        purchase_price,
        famille_id,
        stock_boutique,
        stock_entrepot,
        code_barre
      }: {
        name: string
        price: number
        purchase_price?: number
        famille_id?: number
        stock_boutique?: number
        stock_entrepot?: number
        code_barre?: string
      }
    ) => {
      try {
        return db
          .prepare(
            `INSERT INTO products (name, price, purchase_price, famille_id, stock_boutique, stock_entrepot, code_barre)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            name,
            price,
            purchase_price || 0,
            famille_id || null,
            stock_boutique || 0,
            stock_entrepot || 0,
            code_barre || null
          )
      } catch (err) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint'))
          throw new Error('Un produit avec ce nom existe déjà')
        throw err
      }
    }
  )

  ipcMain.handle(
    'products:update',
    (
      _event,
      {
        id,
        name,
        price,
        purchase_price,
        famille_id,
        stock_boutique,
        stock_entrepot,
        code_barre
      }: {
        id: number
        name: string
        price: number
        purchase_price?: number
        famille_id?: number
        stock_boutique?: number
        stock_entrepot?: number
        code_barre?: string
      }
    ) => {
      try {
        return db
          .prepare(
            `UPDATE products
             SET name = ?, price = ?, purchase_price = ?, famille_id = ?, stock_boutique = ?, stock_entrepot = ?, code_barre = ?
             WHERE id = ?`
          )
          .run(
            name,
            price,
            purchase_price || 0,
            famille_id || null,
            stock_boutique || 0,
            stock_entrepot || 0,
            code_barre || null,
            id
          )
      } catch (err) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint'))
          throw new Error('Un produit avec ce nom existe déjà')
        throw err
      }
    }
  )

  ipcMain.handle('products:updateStock', (_event, { id, stock_boutique, stock_entrepot }) => {
    return db
      .prepare('UPDATE products SET stock_boutique = ?, stock_entrepot = ? WHERE id = ?')
      .run(stock_boutique, stock_entrepot, id)
  })

  ipcMain.handle('products:transferStock', (_event, { id, quantity }) => {
    const product = db.prepare('SELECT stock_entrepot FROM products WHERE id = ?').get(id) as
      | { stock_entrepot: number }
      | undefined
    if (!product) throw new Error('Produit introuvable')
    if (product.stock_entrepot < quantity)
      throw new Error(`Stock entrepôt insuffisant (${product.stock_entrepot} disponible)`)
    db.transaction(() => {
      db.prepare('UPDATE products SET stock_entrepot = stock_entrepot - ? WHERE id = ?').run(
        quantity,
        id
      )
      db.prepare('UPDATE products SET stock_boutique = stock_boutique + ? WHERE id = ?').run(
        quantity,
        id
      )
    })()
    return { success: true }
  })

  ipcMain.handle('products:delete', (_event, id) => {
    db.transaction(() => {
      db.prepare('UPDATE sale_items SET product_id = NULL WHERE product_id = ?').run(id)
      db.prepare('DELETE FROM fournisseur_produits WHERE produit_id = ?').run(id)
      db.prepare('DELETE FROM products WHERE id = ?').run(id)
    })()
    return { success: true }
  })

  ipcMain.handle(
    'products:search',
    (_event, { query, limit }: { query: string; limit?: number }) => {
      const q = `%${query}%`
      const max = limit ?? 50
      return db
        .prepare(
          `SELECT ${LIST_COLUMNS}
           FROM products p
           LEFT JOIN familles f ON f.id = p.famille_id
           WHERE p.name LIKE ? OR p.code_barre LIKE ?
           ORDER BY p.name
           LIMIT ?`
        )
        .all(q, q, max)
    }
  )

  ipcMain.handle('products:getByCategory', (_event, familleId: number | null) => {
    if (familleId === null) {
      return db
        .prepare(
          `SELECT ${LIST_COLUMNS}
           FROM products p
           LEFT JOIN familles f ON f.id = p.famille_id
           ORDER BY p.name`
        )
        .all()
    }
    return db
      .prepare(
        `SELECT ${LIST_COLUMNS}
         FROM products p
         LEFT JOIN familles f ON f.id = p.famille_id
         WHERE p.famille_id = ?
         ORDER BY p.name`
      )
      .all(familleId)
  })

  ipcMain.handle('products:countByCategory', () => {
    return db
      .prepare(
        `SELECT
           p.famille_id as categoryId,
           f.nom as categoryName,
           COUNT(p.id) as count
         FROM products p
         LEFT JOIN familles f ON f.id = p.famille_id
         GROUP BY p.famille_id
         ORDER BY f.nom`
      )
      .all()
  })

  ipcMain.handle(
    'products:getTransferSuggestions',
    (_event, { threshold, targetLevel }: { threshold?: number; targetLevel?: number }) => {
      const t = threshold ?? 10
      const target = targetLevel ?? 20
      return db
        .prepare(
          `SELECT id, name, stock_boutique, stock_entrepot,
           MIN(?, stock_entrepot) as suggestedQty
           FROM products
           WHERE stock_boutique < ? AND stock_entrepot > 0
           ORDER BY stock_boutique ASC`
        )
        .all(target, t)
    }
  )

  ipcMain.handle(
    'products:transferStockBulk',
    (_event, { items }: { items: { id: number; quantity: number }[] }) => {
      if (!items || items.length === 0) throw new Error('Aucun produit sélectionné')

      const transfer = db.transaction(() => {
        let transferred = 0
        for (const item of items) {
          if (item.quantity <= 0) continue
          const product = db
            .prepare('SELECT stock_entrepot FROM products WHERE id = ?')
            .get(item.id) as { stock_entrepot: number } | undefined
          if (!product) throw new Error(`Produit ${item.id} introuvable`)
          if (product.stock_entrepot < item.quantity) {
            const pName = db.prepare('SELECT name FROM products WHERE id = ?').get(item.id) as {
              name: string
            }
            throw new Error(
              `Stock entrepôt insuffisant pour "${pName.name}" (${product.stock_entrepot} disponible, ${item.quantity} demandé)`
            )
          }
          db.prepare('UPDATE products SET stock_entrepot = stock_entrepot - ? WHERE id = ?').run(
            item.quantity,
            item.id
          )
          db.prepare('UPDATE products SET stock_boutique = stock_boutique + ? WHERE id = ?').run(
            item.quantity,
            item.id
          )
          transferred++
        }
        return transferred
      })

      return { transferred: transfer() }
    }
  )
}
