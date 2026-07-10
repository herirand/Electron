import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { generateTicket } from '../utils/ticket'

export function registerSalesHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle(
    'sales:create',
    (
      _event,
      {
        items,
        cashier,
        clientId
      }: {
        items: { productId: number; quantity: number; unitPrice: number }[]
        cashier?: string
        clientId?: number
      }
    ) => {
      const createSale = db.transaction(() => {
        for (const item of items) {
          const product = db
            .prepare('SELECT stock_boutique, name FROM products WHERE id = ?')
            .get(item.productId) as { stock_boutique: number; name: string } | undefined

          if (!product) throw new Error(`Produit ${item.productId} introuvable`)
          if (product.stock_boutique < item.quantity) {
            throw new Error(
              `Stock insuffisant pour ${product.name} (${product.stock_boutique} disponible)`
            )
          }
        }

        const total = items.reduce(
          (sum: number, i: { unitPrice: number; quantity: number }) =>
            sum + i.unitPrice * i.quantity,
          0
        )

        const sale = db
          .prepare('INSERT INTO sales (total, cashier, client_id) VALUES (?, ?, ?)')
          .run(total, cashier || 'caisse', clientId || null)

        for (const item of items) {
          db.prepare(
            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
          ).run(sale.lastInsertRowid, item.productId, item.quantity, item.unitPrice)

          db.prepare('UPDATE products SET stock_boutique = stock_boutique - ? WHERE id = ?').run(
            item.quantity,
            item.productId
          )
        }

        return { saleId: sale.lastInsertRowid, total }
      })

      const result = createSale()

      const ticketsDir = join(app.getPath('userData'), 'tickets')
      if (!existsSync(ticketsDir)) mkdirSync(ticketsDir, { recursive: true })

      const itemsWithNames = items.map(
        (item: { productId: number; quantity: number; unitPrice: number }) => {
          const product = db
            .prepare('SELECT name FROM products WHERE id = ?')
            .get(item.productId) as { name: string }
          return {
            productName: product.name,
            quantity: item.quantity,
            totalPrice: item.unitPrice * item.quantity
          }
        }
      )

      const ticket = generateTicket(result.saleId, itemsWithNames, result.total)
      writeFileSync(join(ticketsDir, `vente_${result.saleId}.txt`), ticket, 'utf-8')

      updateJournalier(db)

      return result
    }
  )

  ipcMain.handle('sales:getAll', () => {
    const sales = db
      .prepare(
        `
      SELECT s.*,
        c.nom as client_nom,
        GROUP_CONCAT(
          json_object('name', COALESCE(p.name, 'Produit supprimé'), 'quantity', si.quantity, 'unit_price', si.unit_price)
        ) as items_json
      FROM sales s
      LEFT JOIN clients c ON c.id = s.client_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      `
      )
      .all()
    return (sales as Array<Record<string, unknown>>).map((sale) => {
      const raw = (sale as { items_json: string | null }).items_json
      return {
        ...sale,
        items: raw ? JSON.parse(`[${raw}]`) : []
      }
    })
  })

  ipcMain.handle('sales:getToday', () => {
    const today = new Date().toISOString().split('T')[0]
    const sales = db
      .prepare(
        `
      SELECT s.*,
        c.nom as client_nom,
        GROUP_CONCAT(
          json_object('name', COALESCE(p.name, 'Produit supprimé'), 'quantity', si.quantity, 'unit_price', si.unit_price)
        ) as items_json
      FROM sales s
      LEFT JOIN clients c ON c.id = s.client_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE date(s.created_at) = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      `
      )
      .all(today)

    return (sales as Array<Record<string, unknown>>).map((sale) => {
      const raw = (sale as { items_json: string | null }).items_json
      return {
        ...sale,
        items: raw ? JSON.parse(`[${raw}]`) : []
      }
    })
  })
}

function updateJournalier(db: Database.Database): void {
  const today = new Date().toISOString().split('T')[0]
  const stats = db
    .prepare(
      `SELECT
        COALESCE(SUM(total), 0) as total_ventes,
        COALESCE(SUM(benefice), 0) as benefice
       FROM sales
       WHERE date(created_at) = ?`
    )
    .get(today) as { total_ventes: number; benefice: number }

  db.prepare(
    `INSERT INTO journalier (date, total_ventes, benefice)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_ventes = excluded.total_ventes,
       benefice = excluded.benefice`
  ).run(today, stats.total_ventes, stats.benefice)
}
