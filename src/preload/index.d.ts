interface Product {
  id: number
  name: string
  price: number
  purchase_price: number
  famille_id: number | null
  famille_nom: string | null
  photo: string | null
  code_barre: string | null
  stock_boutique: number
  stock_entrepot: number
  created_at: string
}

interface User {
  id: number
  username: string
  role: 'admin' | 'cashier'
}

interface SaleItem {
  name: string
  quantity: number
  unit_price: number
}

interface Sale {
  id: number
  total: number
  benefice: number
  created_at: string
  cashier: string
  client_id: number | null
  client_nom: string | null
  client_name: string | null
  status: string
  created_by: string | null
  paid_at: string | null
  validated_by: string | null
  was_credit: number
  items: SaleItem[]
}

interface Famille {
  id: number
  nom: string
}

interface Client {
  id: number
  nom: string
}

interface Fournisseur {
  id: number
  nom: string
  telephone: string | null
  adresse: string | null
}

interface FournisseurProduit {
  id: number
  produit_id: number
  produit_nom: string
}

interface Journalier {
  id: number
  date: string
  total_ventes: number
  benefice: number
}

interface TransferSuggestion {
  id: number
  name: string
  stock_boutique: number
  stock_entrepot: number
  suggestedQty: number
}

interface CashierAPI {
  login(username: string, password: string): Promise<User>
  signup(username: string, password: string): Promise<{ lastInsertRowid: number }>
  getUsers(): Promise<User[]>
  deleteUser(id: number): Promise<{ success: boolean }>

  getProducts(): Promise<Product[]>
  searchProducts(query: string, limit?: number): Promise<Product[]>
  addProduct(data: {
    name: string
    price: number
    purchase_price?: number
    famille_id?: number
    stock_boutique?: number
    stock_entrepot?: number
    code_barre?: string
  }): Promise<{ lastInsertRowid: number }>
  updateProduct(data: {
    id: number
    name: string
    price: number
    purchase_price?: number
    famille_id?: number
    stock_boutique?: number
    stock_entrepot?: number
    code_barre?: string
  }): Promise<{ changes: number }>
  updateStock(
    id: number,
    stock_boutique: number,
    stock_entrepot: number
  ): Promise<{ changes: number }>
  transferStock(id: number, quantity: number): Promise<{ success: boolean }>
  deleteProduct(id: number): Promise<{ changes: number }>
  getProductsByCategory(familleId: number | null): Promise<Product[]>
  countProductsByCategory(): Promise<
    { categoryId: number | null; categoryName: string | null; count: number }[]
  >
  getTransferSuggestions(threshold?: number, targetLevel?: number): Promise<TransferSuggestion[]>
  transferStockBulk(items: { id: number; quantity: number }[]): Promise<{ transferred: number }>

  getCategories(): Promise<Famille[]>
  addCategory(nom: string): Promise<{ lastInsertRowid: number }>
  updateCategory(id: number, nom: string): Promise<{ changes: number }>
  deleteCategory(id: number): Promise<{ success: boolean }>

  getClients(): Promise<Client[]>
  addClient(nom: string): Promise<{ lastInsertRowid: number }>
  updateClient(id: number, nom: string): Promise<{ changes: number }>
  deleteClient(id: number): Promise<{ success: boolean }>

  getFournisseurs(): Promise<Fournisseur[]>
  addFournisseur(data: {
    nom: string
    telephone?: string
    adresse?: string
  }): Promise<{ lastInsertRowid: number }>
  updateFournisseur(data: {
    id: number
    nom: string
    telephone?: string
    adresse?: string
  }): Promise<{ changes: number }>
  deleteFournisseur(id: number): Promise<{ success: boolean }>
  getFournisseurProduits(fournisseurId: number): Promise<FournisseurProduit[]>
  syncFournisseurProduits(
    fournisseurId: number,
    produitIds: number[]
  ): Promise<{ success: boolean }>

  createSale(
    items: { productId: number; quantity: number; unitPrice: number }[],
    cashier?: string,
    clientId?: number,
    isCredit?: boolean,
    clientName?: string
  ): Promise<{ saleId: number; total: number }>
  getSales(): Promise<Sale[]>
  getTodaySales(): Promise<Sale[]>
  getSalesByDate(date: string): Promise<Sale[]>
  getJournalierByMonth(
    year: number,
    month: number
  ): Promise<{ days: Journalier[]; total: number; benefice: number; jour_ventes: number }>
  getCredits(): Promise<Sale[]>
  payCredit(saleId: number, validatedBy: string): Promise<{ success: boolean }>
  openTicketsFolder(): Promise<void>
  getTicketContent(saleId: number): Promise<string | null>
  getAllTickets(): Promise<{ saleId: number; content: string }[]>
  exportTicket(saleId: number): Promise<{ success: boolean; path?: string }>
}

interface Window {
  api: CashierAPI
}
