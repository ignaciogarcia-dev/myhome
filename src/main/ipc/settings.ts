/**
 * Settings IPC Handlers
 * 
 * Handles settings retrieval and updates with in-memory mock storage.
 * In production, this would persist to disk (e.g., using electron-store).
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap, DEFAULT_SETTINGS, type Settings, type PartialSettings } from '../../shared'

// Mock in-memory settings store
// In production, this would be persisted to disk
let currentSettings: Settings = { ...DEFAULT_SETTINGS }

/**
 * Register settings IPC handlers
 */
export function registerSettingsHandlers(): void {
  // Get current settings
  ipcMain.handle(
    CHANNELS.invoke.SETTINGS_GET,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_GET]['res']> => {
      return { ...currentSettings }
    }
  )

  // Update settings (partial merge)
  ipcMain.handle(
    CHANNELS.invoke.SETTINGS_SET,
    async (
      _event,
      partial: InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['res']> => {
      // Merge partial settings with current settings
      currentSettings = {
        ...currentSettings,
        ...partial
      }
      return { ...currentSettings }
    }
  )
}
