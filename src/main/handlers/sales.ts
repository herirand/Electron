import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { generateTicket } from '../utils/ticket'

const SALES_BASE_QUERY = `
  SELECT s.*,
    c.nom as client_nom,
    GROUP_CONCAT(
      json_object('name', COALESCE(p.name, 'Produit supprimé'), 'quantity', si.quantity, 'unit_price', si.unit_price)
    ) as items_json
  FROM sales s
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN sale_items si ON si.sale_id = s.id
  LEFT JOIN products p ON p.id = si.product_id
`

function parseSalesRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((sale) => {
    const raw = (sale as { items_json: string | null }).items_json
    return {
      ...sale,
      items: raw ? JSON.parse(`[${raw}]`) : []
    }
  })
}

export function registerSalesHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle(
    'sales:create',
    async (
      _event,
      {
        items,
        cashier,
        clientId,
        isCredit,
        clientName,
        amountReceived,
        remise
      }: {
        items: { productId: number; quantity: number; unitPrice: number }[]
        cashier?: string
        clientId?: number
        isCredit?: boolean
        clientName?: string
        amountReceived?: number
        remise?: number
      }
    ) => {
      const getProduct = db.prepare(
        'SELECT stock_boutique, name, purchase_price FROM products WHERE id = ?'
      )

      const itemDetails: {
        name: string
        stock: number
        purchasePrice: number
        quantity: number
        unitPrice: number
        productId: number
      }[] = []

      const createSale = db.transaction(() => {
        for (const item of items) {
          const product = getProduct.get(item.productId) as
            | { stock_boutique: number; name: string; purchase_price: number }
            | undefined

          if (!product) throw new Error(`Produit ${item.productId} introuvable`)
          if (product.stock_boutique < item.quantity) {
            throw new Error(
              `Stock insuffisant pour ${product.name} (${product.stock_boutique} disponible)`
            )
          }
          itemDetails.push({
            name: product.name,
            stock: product.stock_boutique,
            purchasePrice: product.purchase_price,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productId: item.productId
          })
        }

        const total = itemDetails.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

        let benefice = 0
        for (const i of itemDetails) {
          benefice += (i.unitPrice - i.purchasePrice) * i.quantity
        }
        benefice -= remise || 0

        const sale = db
          .prepare(
            `INSERT INTO sales (total, benefice, cashier, client_id, status, client_name, created_by, was_credit, remise)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            total,
            benefice,
            cashier || 'caisse',
            clientId || null,
            isCredit ? 'credit' : 'paid',
            clientName || null,
            cashier || 'caisse',
            isCredit ? 1 : 0,
            remise || 0
          )

        const insertItem = db.prepare(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
        )
        const updateStock = db.prepare(
          'UPDATE products SET stock_boutique = stock_boutique - ? WHERE id = ?'
        )

        for (const i of itemDetails) {
          insertItem.run(sale.lastInsertRowid, i.productId, i.quantity, i.unitPrice)
          updateStock.run(i.quantity, i.productId)
        }

        return { saleId: sale.lastInsertRowid, total }
      })

      const result = createSale()

      const ticketsDir = join(app.getPath('userData'), 'tickets')
      if (!existsSync(ticketsDir)) mkdirSync(ticketsDir, { recursive: true })

      const itemsWithNames = itemDetails.map((i) => ({
        productName: i.name,
        quantity: i.quantity,
        totalPrice: i.unitPrice * i.quantity
      }))

      const change =
        amountReceived != null ? amountReceived - (result.total - (remise || 0)) : undefined
      const ticket = generateTicket(
        result.saleId,
        itemsWithNames,
        result.total,
        amountReceived,
        change,
        remise || 0
      )
      writeFileSync(join(ticketsDir, `vente_${result.saleId}.txt`), ticket, 'utf-8')

      if (!isCredit) {
        updateJournalier(db, new Date().toISOString().split('T')[0])
      }

      return result
    }
  )

  ipcMain.handle(
    'sales:getAll',
    (_event, { page = 0, limit = 50 }: { page?: number; limit?: number } = {}) => {
      const offset = page * limit
      const rows = db
        .prepare(
          `${SALES_BASE_QUERY}
           GROUP BY s.id
           ORDER BY s.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Array<Record<string, unknown>>
      return parseSalesRows(rows)
    }
  )

  ipcMain.handle('sales:getToday', () => {
    const today = new Date().toISOString().split('T')[0]
    const rows = db
      .prepare(
        `${SALES_BASE_QUERY}
         WHERE date(s.created_at) = ?
         GROUP BY s.id
         ORDER BY s.created_at DESC`
      )
      .all(today) as Array<Record<string, unknown>>
    return parseSalesRows(rows)
  })

  ipcMain.handle('sales:getByDate', (_event, date: string) => {
    const rows = db
      .prepare(
        `${SALES_BASE_QUERY}
         WHERE date(s.created_at) = ?
         GROUP BY s.id
         ORDER BY s.created_at DESC`
      )
      .all(date) as Array<Record<string, unknown>>
    return parseSalesRows(rows)
  })

  ipcMain.handle(
    'journalier:getByMonth',
    (_event, { year, month }: { year: number; month: number }) => {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const days = db
        .prepare(
          `SELECT * FROM journalier
           WHERE date >= ? AND date <= ?
           ORDER BY date ASC`
        )
        .all(startDate, endDate)

      const summary = db
        .prepare(
          `SELECT
             COALESCE(SUM(total_ventes), 0) as total,
             COALESCE(SUM(benefice), 0) as benefice,
             COUNT(*) as jour_ventes
           FROM journalier
           WHERE date >= ? AND date <= ?`
        )
        .get(startDate, endDate) as {
        total: number
        benefice: number
        jour_ventes: number
      }

      return { days, ...summary }
    }
  )

  ipcMain.handle(
    'sales:getCredits',
    (_event, { page = 0, limit = 100 }: { page?: number; limit?: number } = {}) => {
      const offset = page * limit
      const rows = db
        .prepare(
          `${SALES_BASE_QUERY}
           WHERE s.was_credit = 1
           GROUP BY s.id
           ORDER BY s.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Array<Record<string, unknown>>
      return parseSalesRows(rows)
    }
  )

  ipcMain.handle(
    'sales:payCredit',
    (_event, { saleId, validatedBy }: { saleId: number; validatedBy: string }) => {
      const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId) as
        | { id: number }
        | undefined
      if (!sale) throw new Error('Vente introuvable')

      db.prepare(
        `UPDATE sales SET status = 'paid', paid_at = CURRENT_TIMESTAMP, validated_by = ? WHERE id = ?`
      ).run(validatedBy, saleId)

      const today = new Date().toISOString().split('T')[0]
      updateJournalier(db, today)

      return { success: true }
    }
  )
}

function updateJournalier(db: Database.Database, date: string): void {
  const stats = db
    .prepare(
      `SELECT
        COALESCE(SUM(total), 0) as total_ventes,
        COALESCE(SUM(benefice), 0) as benefice
       FROM sales
       WHERE date(created_at) = ? AND status = 'paid'`
    )
    .get(date) as { total_ventes: number; benefice: number }

  db.prepare(
    `INSERT INTO journalier (date, total_ventes, benefice)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_ventes = excluded.total_ventes,
       benefice = excluded.benefice`
  ).run(date, stats.total_ventes, stats.benefice)
}
