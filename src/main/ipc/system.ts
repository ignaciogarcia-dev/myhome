/**
 * System IPC Handlers
 * 
 * Handles system-level IPC calls like ping for connectivity testing.
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap } from '../../shared'

/**
 * Register system IPC handlers
 */
export function registerSystemHandlers(): void {
  // Handle ping request - returns success status and current timestamp
  ipcMain.handle(
    CHANNELS.invoke.SYSTEM_PING,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.SYSTEM_PING]['res']> => {
      return {
        success: true,
        timestamp: Date.now()
      }
    }
  )
}
