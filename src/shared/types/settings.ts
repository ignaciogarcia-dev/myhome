/**
 * Settings Domain Types
 *
 * Defines the structure of application settings and partial updates.
 */

export interface Settings {
  schemaVersion: number
  theme: 'light' | 'dark' | 'auto'
  language: string
  // Add more settings as needed
}

export type PartialSettings = Partial<Omit<Settings, 'schemaVersion'>> & {
  schemaVersion?: never // Prevent schemaVersion from being updated directly
}

/**
 * Default settings used when no stored settings exist
 */
export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  theme: 'light',
  language: 'en'
}
