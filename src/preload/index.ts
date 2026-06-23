import { contextBridge, ipcRenderer } from "electron";

const api = {
  login: (username: string, password: string) =>
    ipcRenderer.invoke('auth:login', {username, password}),
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (data: { name: string; price: number; quantity: number }) =>
    ipcRenderer.invoke('products:add', data),
  updateProduct: (data: { id: number; name: string; price: number }) =>
    ipcRenderer.invoke('products:update', data),
  updateStock: (id: number, quantity: number) =>
    ipcRenderer.invoke('products:updateStock', { id, quantity }),
  deleteProduct: (id: number) =>
    ipcRenderer.invoke('products:delete', id),

  createSale: (items: { productId: number; quantity: number; unitPrice: number }[], cashier?: string) =>
    ipcRenderer.invoke('sales:create', { items, cashier }),
  getSales: () => ipcRenderer.invoke('sales:getAll'),
  getTodaySales: () => ipcRenderer.invoke('sales:getToday'),
  openTicketsFolder: () => ipcRenderer.invoke('tickets:open'),
  resetDatabase: () => ipcRenderer.invoke('db:reset')
}

contextBridge.exposeInMainWorld('api', api)
