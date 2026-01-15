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
const OPENWEATHERMAP_KEY_NAME = 'openweathermap_api_key'

function normalizeOpenWeatherMapKey(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const appIdMatch = trimmed.match(/appid=([^&]+)/i)
  const candidate = appIdMatch ? appIdMatch[1] : trimmed
  const normalized = candidate.trim()

  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    return null
  }

  return normalized
}

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
    const stored = secrets[ENCRYPTED_KEY_NAME]
    if (stored && stored.trim().length > 0) {
      return stored.trim()
    }

    const envKey = process.env.OPENAI_API_KEY
    if (envKey && envKey.trim().length > 0) {
      return envKey.trim()
    }

    return null
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
 * Get OpenWeatherMap API key
 */
export async function getOpenWeatherMapKey(): Promise<string | null> {
  try {
    const secrets = await loadSecrets()
    const stored = secrets[OPENWEATHERMAP_KEY_NAME]
    if (stored && stored.trim().length > 0) {
      const normalized = normalizeOpenWeatherMapKey(stored)
      if (!normalized) {
        console.warn(
          'Stored OpenWeatherMap API key is invalid. Please re-enter it in Settings.'
        )
      } else {
        // Log first 4 and last 4 characters for debugging (without exposing full key)
        if (normalized.length >= 8) {
          console.log(
            `Using OpenWeatherMap API key: ${normalized.substring(0, 4)}...${normalized.substring(
              normalized.length - 4
            )} (length: ${normalized.length})`
          )
        }
        return normalized
      }
    }

    const envKey = process.env.OPENWEATHERMAP_API_KEY
    if (envKey && envKey.trim().length > 0) {
      const normalized = normalizeOpenWeatherMapKey(envKey)
      if (!normalized) {
        console.warn(
          'OPENWEATHERMAP_API_KEY is invalid. Expected a 32-character hex key.'
        )
      } else {
        return normalized
      }
    }

    return null
  } catch (err) {
    console.error('Failed to load OpenWeatherMap key:', err)
    return null
  }
}

/**
 * Set OpenWeatherMap API key
 */
export async function setOpenWeatherMapKey(apiKey: string): Promise<boolean> {
  try {
    const normalized = normalizeOpenWeatherMapKey(apiKey)
    if (!normalized) {
      console.error(
        'OpenWeatherMap API key appears to be invalid (expected 32 hex characters)'
      )
      return false
    }
    const secrets = await loadSecrets()
    secrets[OPENWEATHERMAP_KEY_NAME] = normalized
    await saveSecrets(secrets)
    console.log('OpenWeatherMap API key saved successfully (length:', normalized.length, ')')
    return true
  } catch (err) {
    console.error('Failed to save OpenWeatherMap key:', err)
    return false
  }
}

/**
 * Check if OpenWeatherMap API key exists
 */
export async function hasOpenWeatherMapKey(): Promise<boolean> {
  try {
    const key = await getOpenWeatherMapKey()
    return key !== null && key.length > 0
  } catch {
    return false
  }
}

/**
 * Clear OpenWeatherMap API key
 */
export async function clearOpenWeatherMapKey(): Promise<boolean> {
  try {
    const secrets = await loadSecrets()
    delete secrets[OPENWEATHERMAP_KEY_NAME]
    await saveSecrets(secrets)
    return true
  } catch (err) {
    console.error('Failed to clear OpenWeatherMap key:', err)
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

  // Set OpenWeatherMap API key
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_SET_OPENWEATHERMAP_KEY,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENWEATHERMAP_KEY]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENWEATHERMAP_KEY]['res']> => {
      const success = await setOpenWeatherMapKey(request.apiKey)
      return { success }
    }
  )

  // Check if OpenWeatherMap API key exists
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_HAS_OPENWEATHERMAP_KEY,
    async (): Promise<
      InvokeMap[typeof CHANNELS.invoke.SECRETS_HAS_OPENWEATHERMAP_KEY]['res']
    > => {
      const hasKey = await hasOpenWeatherMapKey()
      return { hasKey }
    }
  )

  // Clear OpenWeatherMap API key
  ipcMain.handle(
    CHANNELS.invoke.SECRETS_CLEAR_OPENWEATHERMAP_KEY,
    async (): Promise<
      InvokeMap[typeof CHANNELS.invoke.SECRETS_CLEAR_OPENWEATHERMAP_KEY]['res']
    > => {
      const success = await clearOpenWeatherMapKey()
      return { success }
    }
  )
}
