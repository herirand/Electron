import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import db from './database'
import { registerAuthHandlers } from './handlers/auth'
import { registerProductHandlers } from './handlers/products'
import { registerSalesHandlers } from './handlers/sales'

import { registerTicketHandlers } from './handlers/tickets'
import { registerCategoryHandlers } from './handlers/categories'
import { registerClientHandlers } from './handlers/clients'
import { registerFournisseurHandlers } from './handlers/fournisseurs'
import { registerFinanceHandlers, startFinanceScheduler } from './handlers/finance'

// NOUVEAU : tout le process principal raisonne en heure Madagascar (Antananarivo, UTC+3, sans DST)
process.env.TZ = 'Indian/Antananarivo'

registerAuthHandlers(ipcMain, db)
registerProductHandlers(ipcMain, db)
registerSalesHandlers(ipcMain, db)
registerTicketHandlers(ipcMain)
registerCategoryHandlers(ipcMain, db)
registerClientHandlers(ipcMain, db)
registerFournisseurHandlers(ipcMain, db)
registerFinanceHandlers(ipcMain, db)
// NOUVEAU : figement automatique des recettes journalières à minuit + rattrapage au démarrage
startFinanceScheduler(db)

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f2efe4',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
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
