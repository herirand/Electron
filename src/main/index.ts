import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import db from './database'
import { registerAuthHandlers } from './handlers/auth'
import { registerProductHandlers } from './handlers/products'
import { registerSalesHandlers } from './handlers/sales'
import { registerDbHandlers } from './handlers/db'
import { registerTicketHandlers } from './handlers/tickets'
import { registerCategoryHandlers } from './handlers/categories'
import { registerClientHandlers } from './handlers/clients'
import { registerFournisseurHandlers } from './handlers/fournisseurs'

registerAuthHandlers(ipcMain, db)
registerProductHandlers(ipcMain, db)
registerSalesHandlers(ipcMain, db)
registerDbHandlers(ipcMain, db)
registerTicketHandlers(ipcMain)
registerCategoryHandlers(ipcMain, db)
registerClientHandlers(ipcMain, db)
registerFournisseurHandlers(ipcMain, db)

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
