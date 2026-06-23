import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { createHash } from 'crypto'

// Stocke le .db dans le dossier userData (persist entre les sessions)
const dbPath = path.join(app.getPath('userData'), 'pos.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Schéma initial
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','cashier'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total REAL NOT NULL,
    cashier TEXT NOT NULL DEFAULT 'caisse'
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );
`)

//seed user par defaut
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)')
insertUser.run('admin', hashPassword('admin'), 'admin')
insertUser.run('cashier', hashPassword('cashier'), 'cashier')

//produits par defaut
const insertProduct = db.prepare('INSERT OR IGNORE INTO products (name, price, quantity) VALUES (?, ?, ?)')
insertProduct.run('Riz 5kg', 4500, 50)
insertProduct.run('Sucre 1kg', 3000, 30)
insertProduct.run('Huile 1L', 8000, 20)
insertProduct.run('Lait 1L', 3500, 15)
insertProduct.run('Savon', 1500, 40)

export default db
export { hashPassword }