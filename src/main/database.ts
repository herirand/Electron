import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { createHash } from 'crypto'

const dbPath = path.join(app.getPath('userData'), 'pos.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','cashier'))
  );

  CREATE TABLE IF NOT EXISTS familles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0,
    famille_id INTEGER REFERENCES familles(id),
    photo TEXT DEFAULT NULL,
    code_barre TEXT DEFAULT NULL,
    stock_boutique INTEGER NOT NULL DEFAULT 0,
    stock_entrepot INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fournisseurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    telephone TEXT DEFAULT NULL,
    adresse TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS fournisseur_produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
    produit_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(fournisseur_id, produit_id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total REAL NOT NULL,
    benefice REAL NOT NULL DEFAULT 0,
    cashier TEXT NOT NULL DEFAULT 'caisse',
    client_id INTEGER REFERENCES clients(id),
    status TEXT NOT NULL DEFAULT 'paid',
    client_name TEXT,
    created_by TEXT,
    paid_at DATETIME,
    validated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS factures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vente_id INTEGER NOT NULL REFERENCES sales(id),
    fichier TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS journalier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_ventes REAL NOT NULL DEFAULT 0,
    benefice REAL NOT NULL DEFAULT 0
  );
`)

const tableInfo = db.prepare("PRAGMA table_info('products')").all() as { name: string }[]
const colNames = tableInfo.map((c) => c.name)

if (!colNames.includes('famille_id')) {
  db.exec(`ALTER TABLE products ADD COLUMN famille_id INTEGER REFERENCES familles(id)`)
}
if (!colNames.includes('photo')) {
  db.exec(`ALTER TABLE products ADD COLUMN photo TEXT DEFAULT NULL`)
}
if (!colNames.includes('code_barre')) {
  db.exec(`ALTER TABLE products ADD COLUMN code_barre TEXT DEFAULT NULL`)
}
if (!colNames.includes('stock_boutique')) {
  db.exec(`ALTER TABLE products ADD COLUMN stock_boutique INTEGER NOT NULL DEFAULT 0`)
}
if (!colNames.includes('stock_entrepot')) {
  db.exec(`ALTER TABLE products ADD COLUMN stock_entrepot INTEGER NOT NULL DEFAULT 0`)
}
if (!colNames.includes('purchase_price')) {
  db.exec(`ALTER TABLE products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0`)
}
if (colNames.includes('quantity') && colNames.includes('stock_boutique')) {
  db.exec(
    `UPDATE products SET stock_boutique = quantity, stock_entrepot = 0 WHERE stock_boutique = 0 AND quantity > 0`
  )
}

const salesInfo = db.prepare("PRAGMA table_info('sales')").all() as { name: string }[]
if (!salesInfo.some((col) => col.name === 'client_id')) {
  db.exec(`ALTER TABLE sales ADD COLUMN client_id INTEGER REFERENCES clients(id)`)
}
if (!salesInfo.some((col) => col.name === 'benefice')) {
  db.exec(`ALTER TABLE sales ADD COLUMN benefice REAL NOT NULL DEFAULT 0`)
}
if (!salesInfo.some((col) => col.name === 'status')) {
  db.exec(`ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'`)
}
if (!salesInfo.some((col) => col.name === 'client_name')) {
  db.exec(`ALTER TABLE sales ADD COLUMN client_name TEXT`)
}
if (!salesInfo.some((col) => col.name === 'created_by')) {
  db.exec(`ALTER TABLE sales ADD COLUMN created_by TEXT`)
}
if (!salesInfo.some((col) => col.name === 'paid_at')) {
  db.exec(`ALTER TABLE sales ADD COLUMN paid_at DATETIME`)
}
if (!salesInfo.some((col) => col.name === 'validated_by')) {
  db.exec(`ALTER TABLE sales ADD COLUMN validated_by TEXT`)
}
if (!salesInfo.some((col) => col.name === 'was_credit')) {
  db.exec(`ALTER TABLE sales ADD COLUMN was_credit INTEGER NOT NULL DEFAULT 0`)
}

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)'
)
insertUser.run('admin', hashPassword('admin'), 'admin')
insertUser.run('cashier', hashPassword('cashier'), 'cashier')

const insertFamille = db.prepare('INSERT OR IGNORE INTO familles (nom) VALUES (?)')
insertFamille.run('Alimentaire')
insertFamille.run('Boisson')
insertFamille.run('Hygiène')

const alim = db.prepare('SELECT id FROM familles WHERE nom = ?').get('Alimentaire') as {
  id: number
}
const hyg = db.prepare('SELECT id FROM familles WHERE nom = ?').get('Hygiène') as { id: number }

const existingProducts = db.prepare('SELECT id FROM products LIMIT 1').get()
if (!existingProducts) {
  const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (name, price, purchase_price, famille_id, stock_boutique, stock_entrepot) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insertProduct.run('Riz 5kg', 4500, 3500, alim.id, 50, 100)
  insertProduct.run('Sucre 1kg', 3000, 2200, alim.id, 30, 80)
  insertProduct.run('Huile 1L', 8000, 6000, alim.id, 20, 60)
  insertProduct.run('Lait 1L', 3500, 2800, alim.id, 15, 40)
  insertProduct.run('Savon', 1500, 900, hyg.id, 40, 100)
}

export default db
export { hashPassword }
