// clear.js
// Usage : npx electron clear.js chemin/vers/pos.db
// Vide toutes les tables de la base de données.

const Database = require('better-sqlite3')

const DB_PATH = process.argv[2]

if (!DB_PATH) {
  console.error('Usage : npx electron clear.js chemin/vers/pos.db')
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('foreign_keys = OFF')

const tables = [
  'users',
  'familles',
  'products',
  'clients',
  'fournisseurs',
  'fournisseur_produits',
  'sales',
  'sale_items',
  'factures',
  'journalier'
]

const clearDatabase = db.transaction(() => {
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`)
    db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`)
  }
})

clearDatabase()

console.log('Base de données vidée avec succès.')

db.close()
