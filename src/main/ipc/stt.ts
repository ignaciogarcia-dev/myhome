/**
 * STT IPC Handlers
 *
 * Handles speech-to-text transcription requests.
 * Uses mock-first implementation with provider interface for future extensibility.
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap } from '../../shared'

/**
 * STT Provider interface (future-proof for real STT services)
 */
interface SttProvider {
  transcribe(input: {
    audioBase64: string
    mimeType: string
    durationMs: number
  }): Promise<{ text: string; provider: 'mock'; confidence?: number }>
}

/**
 * Mock STT Provider
 * Generates transcripts based on duration (mock-first implementation)
 */
class MockSttProvider implements SttProvider {
  async transcribe(input: {
    audioBase64: string
    mimeType: string
    durationMs: number
  }): Promise<{ text: string; provider: 'mock'; confidence?: number }> {
    // Ignore audioBase64 and mimeType for now (mock-first)
    const { durationMs } = input

    let text = 'User said something'

    // Generate mock transcript based on duration
    if (durationMs < 1000) {
      text = 'Tell me a joke'
    } else if (durationMs >= 1000 && durationMs < 3000) {
      text = 'Hello, how can I help you?'
    } else if (durationMs >= 3000 && durationMs < 5000) {
      text = "What's the weather like today?"
    } else {
      text = `User said something (${(durationMs / 1000).toFixed(1)}s)`
    }

    return {
      text,
      provider: 'mock'
    }
  }
}

// Create provider instance
const sttProvider = new MockSttProvider()

/**
 * Generate fallback transcript (same mapping as MockSttProvider)
 */
function generateFallbackTranscript(durationMs: number): string {
  if (durationMs < 1000) {
    return 'Tell me a joke'
  }
  if (durationMs >= 1000 && durationMs < 3000) {
    return 'Hello, how can I help you?'
  }
  if (durationMs >= 3000 && durationMs < 5000) {
    return "What's the weather like today?"
  }
  return `User said something (${(durationMs / 1000).toFixed(1)}s)`
}

/**
 * Register STT IPC handlers
 */
export function registerSttHandlers(): void {
  // Handle transcribe request
  ipcMain.handle(
    CHANNELS.invoke.STT_TRANSCRIBE,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['res']> => {
      try {
        // Light validation
        if (request.durationMs <= 0 || !request.audioBase64) {
          // Return fallback transcript
          return {
            text: generateFallbackTranscript(request.durationMs || 0),
            provider: 'mock'
          }
        }

        // Call provider
        const result = await sttProvider.transcribe(request)
        return result
      } catch (err) {
        // Log error but return fallback transcript
        console.error('STT transcription error:', err)
        return {
          text: generateFallbackTranscript(request.durationMs || 0),
          provider: 'mock'
        }
      }
    }
  )
}
