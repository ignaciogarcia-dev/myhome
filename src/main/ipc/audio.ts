/**
 * Audio IPC Handlers
 *
 * Handles audio listening state and level monitoring.
 * Uses mock implementation with simulated audio levels.
 */

import { ipcMain, BrowserWindow } from 'electron'
import {
  CHANNELS,
  type InvokeMap,
  type EventMap,
  type AudioState,
  type AudioLevel
} from '../../shared'

// Current audio state
let isListening = false
let levelInterval: NodeJS.Timeout | null = null

// Current audio state object
let currentState: AudioState = {
  isListening: false,
  updatedAt: Date.now()
}

/**
 * Broadcast event to all renderer processes
 */
function broadcastEvent<K extends keyof EventMap>(channel: K, payload: EventMap[K]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  })
}

/**
 * Update audio state and broadcast to renderers
 */
function updateState(listening: boolean): void {
  isListening = listening
  currentState = {
    isListening,
    updatedAt: Date.now()
  }
  broadcastEvent(CHANNELS.events.AUDIO_STATE, currentState)
}

/**
 * Start emitting audio level events at regular intervals
 */
function startLevelEmissions(): void {
  // Clear any existing interval (safety check)
  if (levelInterval !== null) {
    clearInterval(levelInterval)
  }

  // Emit level events every ~75ms
  levelInterval = setInterval(() => {
    const level: AudioLevel = {
      level: Math.max(0, Math.min(1, Math.random())), // Clamp to 0..1
      timestamp: Date.now()
    }
    broadcastEvent(CHANNELS.events.AUDIO_LEVEL, level)
  }, 75)
}

/**
 * Stop emitting audio level events
 */
function stopLevelEmissions(): void {
  if (levelInterval !== null) {
    clearInterval(levelInterval)
    levelInterval = null
  }
}

/**
 * Register audio IPC handlers
 */
export function registerAudioHandlers(): void {
  // Handle start listening request
  ipcMain.handle(
    CHANNELS.invoke.AUDIO_START_LISTENING,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_START_LISTENING]['res']> => {
      // Idempotent: if already listening, return success
      if (isListening) {
        return { success: true }
      }

      // Start listening
      updateState(true)
      startLevelEmissions()

      return { success: true }
    }
  )

  // Handle stop listening request
  ipcMain.handle(
    CHANNELS.invoke.AUDIO_STOP_LISTENING,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_STOP_LISTENING]['res']> => {
      // Idempotent: if not listening, return success
      if (!isListening) {
        return { success: true }
      }

      // Stop listening
      stopLevelEmissions()
      updateState(false)

      return { success: true }
    }
  )
}
