interface Product {
  id: number
  name: string
  price: number
  quantity: number
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
  created_at: string
  cashier: string
  items: SaleItem[]
}

interface CashierAPI {
  login(username: string, password: string): Promise<User>
  getProducts(): Promise<Product[]>
  addProduct(data: { name: string; price: number; quantity: number }): Promise<{ lastInsertRowid: number }>
  updateProduct(data: { id: number; name: string; price: number }): Promise<{ changes: number }>
  updateStock(id: number, quantity: number): Promise<{ changes: number }>
  deleteProduct(id: number): Promise<{ changes: number }>
  createSale(items: { productId: number; quantity: number; unitPrice: number }[], cashier?: string): Promise<{ saleId: number; total: number }>
  getSales(): Promise<Sale[]>
  getTodaySales(): Promise<Sale[]>
  openTicketsFolder(): Promise<void>
  resetDatabase(): Promise<{ success: boolean }>
}

interface Window {
  api: CashierAPI
}