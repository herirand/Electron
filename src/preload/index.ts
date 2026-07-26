import { contextBridge, ipcRenderer } from 'electron'

const api = {
  login: (username: string, password: string) =>
    ipcRenderer.invoke('auth:login', { username, password }),
  signup: (username: string, password: string) =>
    ipcRenderer.invoke('auth:signup', { username, password }),
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  deleteUser: (id: number) => ipcRenderer.invoke('users:delete', id),

  getProducts: () => ipcRenderer.invoke('products:getAll'),
  searchProducts: (query: string, limit?: number) =>
    ipcRenderer.invoke('products:search', { query, limit }),
  addProduct: (data: {
    name: string
    price: number
    purchase_price?: number
    famille_id?: number
    stock_boutique?: number
    stock_entrepot?: number
    code_barre?: string
  }) => ipcRenderer.invoke('products:add', data),
  updateProduct: (data: {
    id: number
    name: string
    price: number
    purchase_price?: number
    famille_id?: number
    stock_boutique?: number
    stock_entrepot?: number
    code_barre?: string
  }) => ipcRenderer.invoke('products:update', data),
  updateStock: (id: number, stock_boutique: number, stock_entrepot: number) =>
    ipcRenderer.invoke('products:updateStock', { id, stock_boutique, stock_entrepot }),
  transferStock: (id: number, quantity: number) =>
    ipcRenderer.invoke('products:transferStock', { id, quantity }),
  deleteProduct: (id: number) => ipcRenderer.invoke('products:delete', id),
  getProductsByCategory: (familleId: number | null) =>
    ipcRenderer.invoke('products:getByCategory', familleId),
  countProductsByCategory: () => ipcRenderer.invoke('products:countByCategory'),
  getTransferSuggestions: (threshold?: number, targetLevel?: number) =>
    ipcRenderer.invoke('products:getTransferSuggestions', { threshold, targetLevel }),
  transferStockBulk: (items: { id: number; quantity: number }[]) =>
    ipcRenderer.invoke('products:transferStockBulk', { items }),

  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  addCategory: (nom: string) => ipcRenderer.invoke('categories:add', { nom }),
  updateCategory: (id: number, nom: string) => ipcRenderer.invoke('categories:update', { id, nom }),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),

  getClients: () => ipcRenderer.invoke('clients:getAll'),
  addClient: (nom: string) => ipcRenderer.invoke('clients:add', { nom }),
  updateClient: (id: number, nom: string) => ipcRenderer.invoke('clients:update', { id, nom }),
  deleteClient: (id: number) => ipcRenderer.invoke('clients:delete', id),

  getFournisseurs: () => ipcRenderer.invoke('fournisseurs:getAll'),
  addFournisseur: (data: { nom: string; telephone?: string; adresse?: string }) =>
    ipcRenderer.invoke('fournisseurs:add', data),
  updateFournisseur: (data: { id: number; nom: string; telephone?: string; adresse?: string }) =>
    ipcRenderer.invoke('fournisseurs:update', data),
  deleteFournisseur: (id: number) => ipcRenderer.invoke('fournisseurs:delete', id),
  getFournisseurProduits: (fournisseurId: number) =>
    ipcRenderer.invoke('fournisseur-produits:getByFournisseur', fournisseurId),
  syncFournisseurProduits: (fournisseurId: number, produitIds: number[]) =>
    ipcRenderer.invoke('fournisseur-produits:sync', { fournisseurId, produitIds }),

  createSale: (
    items: { productId: number; quantity: number; unitPrice: number }[],
    cashier?: string,
    clientId?: number,
    isCredit?: boolean,
    clientName?: string,
    amountReceived?: number,
    remise?: number
  ) =>
    ipcRenderer.invoke('sales:create', {
      items,
      cashier,
      clientId,
      isCredit,
      clientName,
      amountReceived,
      remise
    }),
  getSales: (page?: number, limit?: number) => ipcRenderer.invoke('sales:getAll', { page, limit }),
  getTodaySales: () => ipcRenderer.invoke('sales:getToday'),
  getSalesByDate: (date: string) => ipcRenderer.invoke('sales:getByDate', date),
  getJournalierByMonth: (year: number, month: number) =>
    ipcRenderer.invoke('journalier:getByMonth', { year, month }),
  getCredits: (page?: number, limit?: number) =>
    ipcRenderer.invoke('sales:getCredits', { page, limit }),
  payCredit: (saleId: number, validatedBy: string) =>
    ipcRenderer.invoke('sales:payCredit', { saleId, validatedBy }),
  openTicketsFolder: () => ipcRenderer.invoke('tickets:open'),
  getTicketContent: (saleId: number) => ipcRenderer.invoke('tickets:getContent', saleId),
  getAllTickets: () => ipcRenderer.invoke('tickets:getAll'),
  exportTicket: (saleId: number) => ipcRenderer.invoke('tickets:export', saleId)
}

contextBridge.exposeInMainWorld('api', api)
