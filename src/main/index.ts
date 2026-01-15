import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerSystemHandlers } from './ipc/system'
import { registerSettingsHandlers } from './ipc/settings'
import { registerSecretsHandlers } from './ipc/secrets'
import { registerRealtimeHandlers } from './ipc/realtime'
import { registerWeatherHandlers } from './ipc/weather'

/**
 * Register all IPC handlers
 * Centralized registration point for all IPC domains
 */
function registerIpcHandlers(): void {
  registerSystemHandlers()
  registerSettingsHandlers()
  registerSecretsHandlers()
  registerRealtimeHandlers()
  registerWeatherHandlers()
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, // Security: isolate context from renderer
      nodeIntegration: false, // Security: disable Node.js in renderer
      sandbox: false
    }
  })

  if (is.dev) {
    mainWindow.webContents.on('console-message', (details) => {
      const { level, message, lineNumber, sourceId } = details
      const levelMap: Record<string, 'log' | 'warn' | 'error' | 'debug'> = {
        info: 'log',
        warning: 'warn',
        error: 'error',
        debug: 'debug'
      }
      const label = levelMap[level] ?? 'log'
      const prefix = `[renderer:${label}]`
      const location = sourceId ? ` (${sourceId}:${lineNumber})` : ''

      if (label === 'error') {
        console.error(`${prefix} ${message}${location}`)
      } else if (label === 'warn') {
        console.warn(`${prefix} ${message}${location}`)
      } else {
        console.log(`${prefix} ${message}${location}`)
      }
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register all IPC handlers
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
