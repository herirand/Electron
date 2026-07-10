import { IpcMain, shell } from 'electron'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

export function registerTicketHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('tickets:open', () => {
    const dir = join(app.getPath('userData'), 'tickets')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    shell.openPath(dir)
  })
}
