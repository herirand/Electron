// import.js
// Usage : node import.js chemin/vers/bsl.xlsx chemin/vers/pos.db

const path = require('path')
const XLSX = require('xlsx')
const Database = require('better-sqlite3')

// --- Config ---------------------------------------------------------
const EXCEL_PATH = process.argv[2] || path.join(__dirname, 'bsl.xlsx')
const DB_PATH = process.argv[3] || path.join(__dirname, 'database.db')
const FAMILLE_ID_PAR_DEFAUT = null

// --- Lecture du fichier Excel ---------------------------------------
const workbook = XLSX.readFile(EXCEL_PATH)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

// --- Connexion DB -----------------------------------------------------
const db = new Database(DB_PATH)

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
    (name, price, purchase_price, famille_id, stock_boutique, stock_entrepot)
  VALUES (?, ?, ?, ?, ?, ?)
`)

// --- Import -----------------------------------------------------------
let inserted = 0
let skipped = 0

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    const name = (row['PRODUITS'] || '').toString().trim()
    if (!name) { skipped++; continue }

    const purchasePrice = Number(row['P.  A']) || 0
    const price = Number(row['P.V']) || 0
    const stockBoutique = Number(row['SB']) || 0
    const stockEntrepot = Number(row['S']) || 0

    const result = insertProduct.run(
      name, price, purchasePrice, FAMILLE_ID_PAR_DEFAUT, stockBoutique, stockEntrepot
    )
    if (result.changes > 0) inserted++
    else skipped++
  }
})

insertMany(rows)
console.log(`Import terminé : ${inserted} produits insérés, ${skipped} ignorés.`)
db.close()