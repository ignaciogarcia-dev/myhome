/**
 * TTS IPC Handlers
 *
 * Handles text-to-speech commands by broadcasting to all renderer windows.
 * Renderers use SpeechSynthesis API for actual playback.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { CHANNELS, type InvokeMap, type EventMap } from '../../shared'

/**
 * Broadcast TTS command to all renderer processes
 */
function broadcastTtsCommand<K extends keyof EventMap>(channel: K, payload: EventMap[K]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  })
}

/**
 * Register TTS IPC handlers
 */
export function registerTtsHandlers(): void {
  // Handle speak request
  ipcMain.handle(
    CHANNELS.invoke.TTS_SPEAK,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.TTS_SPEAK]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.TTS_SPEAK]['res']> => {
      // Broadcast speak command to all renderer windows
      broadcastTtsCommand(CHANNELS.events.TTS_SPEAK, {
        text: request.text,
        voice: request.voice,
        rate: request.rate,
        pitch: request.pitch,
        volume: request.volume
      })

      return { success: true }
    }
  )

  // Handle stop request
  ipcMain.handle(
    CHANNELS.invoke.TTS_STOP,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.TTS_STOP]['res']> => {
      // Broadcast stop command to all renderer windows
      broadcastTtsCommand(CHANNELS.events.TTS_STOP, undefined)

      return { success: true }
    }
  )
}
