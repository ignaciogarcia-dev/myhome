/**
 * Secrets IPC Handlers
 *
 * Handles secure storage of sensitive data like API keys.
 * Uses Electron safeStorage for encryption.
 */

import { ipcMain, app, safeStorage } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { CHANNELS, type InvokeMap } from '../../shared'

const SECRETS_FILE = 'secrets.json'
const ENCRYPTED_KEY_NAME = 'openai_api_key'

/**
 * Get path to secrets file
 */
function getSecretsPath(): string {
  return join(app.getPath('userData'), SECRETS_FILE)
}

/**
 * Load secrets from disk
 */
async function loadSecrets(): Promise<Record<string, string>> {
  try {
    const path = getSecretsPath()
    const data = await readFile(path, 'utf-8')
    const secrets = JSON.parse(data) as Record<string, string>

    // Decrypt stored values
    const decrypted: Record<string, string> = {}
    for (const [key, encrypted] of Object.entries(secrets)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(encrypted, 'base64')
          decrypted[key] = safeStorage.decryptString(buffer)
        } catch {
          // If decryption fails, skip this key
          console.warn(`Failed to decrypt secret: ${key}`)
        }
      } else {
        // Fallback: store plaintext (not recommended for production)
        decrypted[key] = encrypted
      }
    }
    return decrypted
  } catch {
    // File doesn't exist or is invalid, return empty
    return {}
  }
}

/**
 * Save secrets to disk (encrypted)
 */
async function saveSecrets(secrets: Record<string, string>): Promise<void> {
  const path = getSecretsPath()
  const encrypted: Record<string, string> = {}

  // Encrypt values before storing
  for (const [key, value] of Object.entries(secrets)) {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(value)
      encrypted[key] = buffer.toString('base64')
    } else {
      // Fallback: store plaintext (not recommended for production)
      encrypted[key] = value
    }
  }

  // Ensure userData directory exists
  const userDataPath = app.getPath('userData')
  await mkdir(userDataPath, { recursive: true })

  // Write encrypted secrets
  await writeFile(path, JSON.stringify(encrypted, null, 2), 'utf-8')
}

/**
 * Get OpenAI API key
 */
export async function getOpenAIKey(): Promise<string | null> {
  try {
    const secrets = await loadSecrets()
    return secrets[ENCRYPTED_KEY_NAME] || null
  } catch (err) {
    console.error('Failed to load OpenAI key:', err)
    return null
  }
}

/**
 * Set OpenAI API key
 */
export async function setOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const secrets = await loadSecrets()
    secrets[ENCRYPTED_KEY_NAME] = apiKey
    await saveSecrets(secrets)
    return true
  } catch (err) {
    console.error('Failed to save OpenAI key:', err)
    return false
  }
}

/**
 * Check if OpenAI API key exists
 */
export async function hasOpenAIKey(): Promise<boolean> {
  try {
    const key = await getOpenAIKey()
    return key !== null && key.length > 0
  } catch {
    return false
  }
}

/**
 * Clear OpenAI API key
 */
export async function clearOpenAIKey(): Promise<boolean> {
  try {
    const secrets = await loadSecrets()
    delete secrets[ENCRYPTED_KEY_NAME]
    await saveSecrets(secrets)
    return true
  } catch (err) {
    console.error('Failed to clear OpenAI key:', err)
    return false
  }
}

/**
 * Register secrets IPC handlers
 */
export function registerSecretsHandlers(): void {
  // Set OpenAI API key
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_SET_OPENAI_KEY,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENAI_KEY]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENAI_KEY]['res']> => {
      const success = await setOpenAIKey(request.apiKey)
      return { success }
    }
  )

  // Check if OpenAI API key exists
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY]['res']> => {
      const hasKey = await hasOpenAIKey()
      return { hasKey }
    }
  )

  // Clear OpenAI API key
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY]['res']> => {
      const success = await clearOpenAIKey()
      return { success }
    }
  )
}
