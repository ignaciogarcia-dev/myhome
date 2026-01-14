/**
 * Realtime IPC Handlers
 *
 * Handles OpenAI Realtime API session creation and ephemeral token generation.
 * Supports both direct API calls and optional backend URL.
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap } from '../../shared'
import { getOpenAIKey } from './secrets'

/**
 * Register Realtime IPC handlers
 */
export function registerRealtimeHandlers(): void {
  // Handle get session request (ephemeral token generation)
  ipcMain.handle(
    CHANNELS.invoke.REALTIME_GET_SESSION,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['res']> => {
      try {
        const apiKey = await getOpenAIKey()
        if (!apiKey) {
          throw new Error('OpenAI API key not found. Please configure it in settings.')
        }

        // If backend URL is provided, use it instead of direct API call
        if (request.backendUrl) {
          console.log('[Realtime] Using backend URL for session:', request.backendUrl)
          const response = await fetch(request.backendUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`Backend session request failed: ${response.status} ${response.statusText}`)
          }

          const session = await response.json()
          return {
            clientSecret: session.client_secret?.value || '',
            sessionId: session.id || '',
            expiresAt: session.client_secret?.expires_at || 0
          }
        }

        // Direct API call to OpenAI
        console.log('[Realtime] Creating session via OpenAI API')
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini-realtime-preview',
            modalities: ['audio', 'text']
          })
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          console.error('[Realtime] Session creation failed:', response.status, errorText)
          throw new Error(`Failed to create session: ${response.status} ${response.statusText} ${errorText}`)
        }

        const session = (await response.json()) as {
          id: string
          client_secret?: {
            value: string
            expires_at: number
          }
        }

        if (!session.client_secret?.value) {
          throw new Error('Session created but no client_secret returned')
        }

        console.log('[Realtime] Session created successfully:', {
          sessionId: session.id,
          expiresAt: session.client_secret.expires_at
        })

        return {
          clientSecret: session.client_secret.value,
          sessionId: session.id,
          expiresAt: session.client_secret.expires_at
        }
      } catch (err) {
        console.error('[Realtime] Error creating session:', err)
        throw err
      }
    }
  )
}
