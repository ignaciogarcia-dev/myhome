/**
 * Realtime session helper (renderer-only).
 *
 * Obtains the ephemeral client secret via preload IPC.
 */
export async function getRealtimeClientSecret(): Promise<string> {
  const session = await window.api.realtime.getSession({})
  const token = session.clientSecret

  if (!token) {
    throw new Error('Failed to get session token')
  }

  return token
}

