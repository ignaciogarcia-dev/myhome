import React, { useState, useEffect } from 'react'
import type { Settings } from '@shared/types/settings'

/**
 * Settings Screen - Tests settings.get() and settings.set() IPC calls
 */
export default function SettingsScreen(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [theme, setTheme] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        const currentSettings = await window.api.settings.get()
        setSettings(currentSettings)
        setTheme(currentSettings.theme)
        setLanguage(currentSettings.language)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Type assertion: theme should be 'light' | 'dark' | 'auto', but we allow user input
      const partial: { theme?: 'light' | 'dark' | 'auto'; language?: string } = {}
      if (theme && (theme === 'light' || theme === 'dark' || theme === 'auto')) {
        partial.theme = theme
      }
      if (language) {
        partial.language = language
      }
      const updatedSettings = await window.api.settings.set(partial)
      setSettings(updatedSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Settings</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Theme:
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
            placeholder="light, dark, or auto"
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Language:
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
            placeholder="en, es, etc."
          />
        </label>
      </div>

      <button onClick={handleSave} disabled={loading} style={{ marginBottom: '20px' }}>
        {loading ? 'Saving...' : 'Save'}
      </button>

      {settings && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>Current Settings:</h3>
          <div>Theme: {settings.theme}</div>
          <div>Language: {settings.language}</div>
          <div>Schema Version: {settings.schemaVersion}</div>
        </div>
      )}
    </div>
  )
}
