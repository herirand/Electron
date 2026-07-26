// seed.js
// Usage :
//   npx electron seed.js                      → seed ./pos.db avec bsl.xlsx
//   npx electron seed.js ./custom.xlsx        → seed ./pos.db avec le fichier spécifié
//   npx electron seed.js ./custom.xlsx out.db → seed le fichier DB spécifié
//   npx electron seed.js --clean              → vider la DB sans réimporter
//   npx electron seed.js --clean ./custom.xlsx out.db → clean puis seed
//
// Combine clear + import + schema + index + admin user en une seule passe.

const path = require('path')
const fs = require('fs')
const { createHash } = require('crypto')

// --- Args -----------------------------------------------------------
const args = process.argv.slice(2)
const cleanOnly = args.includes('--clean')
const filteredArgs = args.filter((a) => a !== '--clean')

const EXCEL_PATH = filteredArgs[0] || path.join(__dirname, 'bsl.xlsx')
const { app } = require('electron')
app.name = 'pos-app'
const DB_PATH = filteredArgs[1] || path.join(app.getPath('userData'), 'pos.db')

// --- Vérifications ---------------------------------------------------
if (!cleanOnly && !fs.existsSync(EXCEL_PATH)) {
  console.error(`Fichier Excel introuvable : ${EXCEL_PATH}`)
  process.exit(1)
}

// --- XLSX (lazy require pour message d'erreur propre) ---------------
let XLSX
if (!cleanOnly) {
  try {
    XLSX = require('xlsx')
  } catch {
    console.error('xlsx non installé. Lancez : npm install')
    process.exit(1)
  }
}

// --- better-sqlite3 --------------------------------------------------
let Database
try {
  Database = require('better-sqlite3')
} catch {
  console.error('better-sqlite3 non installé. Lancez : npm install')
  process.exit(1)
}

// --- Helpers ---------------------------------------------------------
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

// --- Lecture Excel ----------------------------------------------------
let rows = []
if (!cleanOnly) {
  const workbook = XLSX.readFile(EXCEL_PATH)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  if (rows.length === 0) {
    console.error("Le fichier Excel est vide ou n'a pas de feuille de données.")
    process.exit(1)
  }

  const sampleRow = rows[0]
  const requiredCols = ['PRODUITS', 'P.V']
  const missingCols = requiredCols.filter((c) => !(c in sampleRow))
  if (missingCols.length > 0) {
    console.error(`Colonnes manquantes dans l'Excel : ${missingCols.join(', ')}`)
    console.error(`Colonnes trouvées : ${Object.keys(sampleRow).join(', ')}`)
    process.exit(1)
  }
}

// --- Connexion DB + Schema -------------------------------------------
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = OFF')

console.log(`Base : ${DB_PATH}`)
if (!cleanOnly) console.log(`Excel : ${EXCEL_PATH} (${rows.length} lignes)`)

// --- Création du schema (même schema que database.ts) ----------------
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
    validated_by TEXT,
    was_credit INTEGER NOT NULL DEFAULT 0,
    remise REAL NOT NULL DEFAULT 0
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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_famille ON products(famille_id);
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(code_barre);
  CREATE INDEX IF NOT EXISTS idx_products_famille_name ON products(famille_id, name);
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(date(created_at));
  CREATE INDEX IF NOT EXISTS idx_sales_was_credit ON sales(was_credit);
`)

// --- Clear -----------------------------------------------------------
const tables = [
  'sale_items',
  'sales',
  'factures',
  'journalier',
  'fournisseur_produits',
  'products',
  'fournisseurs',
  'clients',
  'familles',
  'users'
]

const clearAll = db.transaction(() => {
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`)
    db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`)
  }
})

clearAll()
console.log('Tables vidées.')

if (cleanOnly) {
  // Mode clean only : réinsérer admin par défaut
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)'
  )
  insertUser.run('admin', hashPassword('1806soa'), 'admin')
  console.log('Admin par défaut : admin / 1806soa')
  db.close()
  console.log(`Clean terminé → ${DB_PATH}`)
  try {
    if (app && app.quit) app.quit()
  } catch {}
  process.exit(0)
}

// --- Import produits --------------------------------------------------
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
    (name, price, purchase_price, famille_id, stock_boutique, stock_entrepot)
  VALUES (?, ?, ?, ?, ?, ?)
`)

let inserted = 0
let skipped = 0

const insertProducts = db.transaction((rows) => {
  for (const row of rows) {
    const name = (row['PRODUITS'] || '').toString().trim()
    if (!name) {
      skipped++
      continue
    }

    const purchasePrice = Number(row['P.  A']) || Number(row['P.A']) || 0
    const price = Number(row['P.V']) || 0
    const stockBoutique = Number(row['SB']) || 0
    const stockEntrepot = Number(row['S']) || 0

    const result = insertProduct.run(name, price, purchasePrice, null, stockBoutique, stockEntrepot)
    if (result.changes > 0) inserted++
    else skipped++
  }
})

insertProducts(rows)
console.log(`Produits : ${inserted} insérés, ${skipped} ignorés (doublons ou vides).`)

// --- Insert admin par défaut -----------------------------------------
const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)'
)
insertUser.run('admin', hashPassword('1806soa'), 'admin')
console.log('Admin par défaut : admin / 1806soa')

// --- Fermeture -------------------------------------------------------
db.close()
console.log(`Seed terminé → ${DB_PATH}`)

// Quitter Electron si exécuté via `npx electron seed.js`
try {
  if (app && app.quit) app.quit()
} catch {
  // Pas en mode Electron, rien à faire
}
