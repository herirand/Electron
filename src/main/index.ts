import {app, BrowserWindow, ipcMain, shell} from 'electron';
import {join} from 'path';
import { is } from '@electron-toolkit/utils';
import db, {hashPassword} from './database';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// --------------AUTH--------------
ipcMain.handle('auth:login', (_event, {username, password}) => {
  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, hashPassword(password)) as { id: number; username: string; role: 'admin' | 'cashier' } | undefined;
  if (!user) {
    throw new Error('Identifiants incorrects');
  }
  return user;
})

// --------------PRODUITS--------------
ipcMain.handle('products:getAll', () => {
  return db.prepare('SELECT * FROM products ORDER BY name').all();
});

ipcMain.handle('products:add', (_event, {name, price, quantity}) => {
  try {
    return db.prepare('INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)').run(name, price, quantity);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint'))
      throw new Error('Un produit avec ce nom existe déjà')
    throw err
  }
});

ipcMain.handle('products:update', (_event, {id, name, price}) => {
  try {
    return db.prepare('UPDATE products SET name = ?, price = ? WHERE id = ?').run(name, price, id);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint'))
      throw new Error('Un produit avec ce nom existe déjà')
    throw err
  }
});

ipcMain.handle('products:updateStock', (_event, {id, quantity}) => {
  return db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(quantity, id);
});

ipcMain.handle('products:delete', (_event, id) => {
  db.transaction(() => {
    db.prepare('UPDATE sale_items SET product_id = NULL WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
  })()
  return { success: true }
});

// --------------VENTES--------------
function generateTicket(_saleId: number| bigint, items: unknown[], total: number): string{
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR');
  const time = now.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

  let ticket = ''
  ticket += '╔══════════════════════════════╗\n'
  ticket += '║        Bazar Soa             ║\n'
  ticket += '║    Ticket de caisse          ║\n'
  ticket += `║    ${date} à ${time}           ║\n`
  ticket += '╠══════════════════════════════╣\n'

  for (const item of items) {
    const itemAny = item as { productName: string; quantity: number; totalPrice: number }
    const name = itemAny.productName.padEnd(12)
    const qty = String(itemAny.quantity).padStart(2)
    const price = String(itemAny.totalPrice).padStart(8)
    ticket += `║ ${name} x${qty}  ${price} Ar║\n`
  }

  ticket += `║ TOTAL               ${String(total).padStart(8)} Ar║\n`
  ticket += '║                              ║\n'
  ticket += '║     Merci de votre visite     ║\n'
  ticket += '╚══════════════════════════════╝\n'

  return ticket;
}

ipcMain.handle('sales:create', (_event, {items, cashier}) => {
  const createSale = db.transaction(({items, cashier}) => {
    for (const item of items) {
      const product = db.prepare(
        'SELECT quantity, name FROM products WHERE id = ?'
      ).get(item.productId) as {quantity: number, name: string} | undefined

      if (!product) throw new Error(`Produit ${item.productId} introuvable`)
      if (product.quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }
    }
    
    const total = items.reduce((sum: number, i: {unitPrice: number; quantity: number}) => 
      sum + i.unitPrice * i.quantity, 0
    )

    const sale = db.prepare(
      'INSERT INTO sales (total, cashier) VALUES (?, ?)'
    ).run(total, cashier || 'caisse')

    for (const item of items) {
      db.prepare(
        'INSERT INTO sale_items (sale_id , product_id , quantity, unit_price) VALUES  (?, ?, ?, ?)'
      ).run(sale.lastInsertRowid, item.productId, item.quantity, item.unitPrice)

      db.prepare(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?'
      ).run(item.quantity, item.productId)
    }

    return {saleId: sale.lastInsertRowid, total}
  })

  const result = createSale({items, cashier})

  //generer ticket
  const ticketsDir = join(app.getPath('userData'), 'tickets')
  if (!existsSync(ticketsDir))
    mkdirSync(ticketsDir, {recursive: true})

  const itemsWithNames = items.map((item: {productId: number; quantity: number; unitPrice: number}) => {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.productId) as {name: string}
    return {
      productName: product.name,
      quantity: item.quantity,
      totalPrice: item.unitPrice * item.quantity
    }
  })

  const ticket = generateTicket(result.saleId, itemsWithNames, result.total)
  writeFileSync(join(ticketsDir, `vente_${result.saleId}.txt`), ticket, 'utf-8')

  return result;
})

ipcMain.handle('sales:getAll', () => {
  const sales = db.prepare(`
    SELECT s.*, GROUP_CONCAT(
      json_object('name', COALESCE(p.name, 'Produit supprimé'), 'quantity', si.quantity, 'unit_price', si.unit_price)
      ) as items_json
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       GROUP BY s.id
       ORDER BY s.created_at DESC
       `).all()
  return (sales as Array<Record<string, unknown>>).map(sale => {
    const raw = (sale as { items_json: string | null }).items_json
    return {
      ...sale,
      items: raw ? JSON.parse(`[${raw}]`) : []
    }
  })
})

ipcMain.handle('sales:getToday', () => {
  const today = new Date().toISOString().split('T')[0]
  const sales = db.prepare(`
    SELECT s.*, GROUP_CONCAT(
      json_object('name', COALESCE(p.name, 'Produit supprimé'), 'quantity', si.quantity, 'unit_price', si.unit_price)
    ) as items_json
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE date(s.created_at) = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all(today)

  return (sales as Array<Record<string, unknown>>).map(sale => {
    const raw = (sale as { items_json: string | null }).items_json
    return {
      ...sale,
      items: raw ? JSON.parse(`[${raw}]`) : []
    }
  })
})

//-----------------RESET BASE-------------------
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

//-----------------DOSSIER TICKETS--------------
ipcMain.handle('tickets:open', () => {
  const dir = join(app.getPath('userData'), 'tickets')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  shell.openPath(dir)
})

//-----------------FENETRE--------------
app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
})