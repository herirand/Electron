import { IpcMain, shell, dialog, BrowserWindow } from 'electron'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync, readdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'

export function registerTicketHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('tickets:open', async () => {
    const dir = join(app.getPath('userData'), 'tickets')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    shell.openPath(dir)
  })

  ipcMain.handle('tickets:getContent', async (_event, saleId: number) => {
    const dir = join(app.getPath('userData'), 'tickets')
    const filePath = join(dir, `vente_${saleId}.txt`)
    if (!existsSync(filePath)) return null
    return readFile(filePath, 'utf-8')
  })

  ipcMain.handle('tickets:getAll', async () => {
    const dir = join(app.getPath('userData'), 'tickets')
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter((f) => f.startsWith('vente_') && f.endsWith('.txt'))

    const results = await Promise.all(
      files.map(async (f) => {
        const saleId = parseInt(f.replace('vente_', '').replace('.txt', ''), 10)
        const content = await readFile(join(dir, f), 'utf-8')
        return { saleId, content }
      })
    )

    return results.sort((a, b) => b.saleId - a.saleId)
  })

  ipcMain.handle('tickets:export', async (_event, saleId: number) => {
    const dir = join(app.getPath('userData'), 'tickets')
    const filePath = join(dir, `vente_${saleId}.txt`)
    if (!existsSync(filePath)) throw new Error('Ticket introuvable')

    const content = await readFile(filePath, 'utf-8')
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Exporter le ticket',
      defaultPath: `vente_${saleId}.txt`,
      filters: [{ name: 'Fichier texte', extensions: ['txt'] }]
    })

    if (result.canceled || !result.filePath) return { success: false }
    await writeFile(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  })
}
