import React, { useState, useEffect } from 'react'
import type { Settings } from '@shared/types/settings'

const normalizeOpenWeatherMapKey = (input: string): string | null => {
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
 * Settings Screen - Tests settings.get() and settings.set() IPC calls
 */
export default function SettingsScreen(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [theme, setTheme] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [openaiKey, setOpenaiKey] = useState<string>('')
  const [hasOpenaiKey, setHasOpenaiKey] = useState<boolean>(false)
  const [openWeatherMapKey, setOpenWeatherMapKey] = useState<string>('')
  const [hasOpenWeatherMapKey, setHasOpenWeatherMapKey] = useState<boolean>(false)
  const [citySearch, setCitySearch] = useState<string>('')
  const [geocodeResults, setGeocodeResults] = useState<
    Array<{ name: string; country?: string; lat: number; lon: number }>
  >([])
  const [geocoding, setGeocoding] = useState<boolean>(false)
  const [testingApiKey, setTestingApiKey] = useState<boolean>(false)
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

        // Check if OpenAI key exists
        const keyCheck = await window.api.secrets.hasOpenAIKey()
        setHasOpenaiKey(keyCheck.hasKey)

        // Check if OpenWeatherMap key exists
        const weatherKeyCheck = await window.api.secrets.hasOpenWeatherMapKey()
        setHasOpenWeatherMapKey(weatherKeyCheck.hasKey)
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
      const partial: {
        theme?: 'light' | 'dark' | 'auto'
        language?: string
      } = {}
      if (theme && (theme === 'light' || theme === 'dark' || theme === 'auto')) {
        partial.theme = theme
      }
      if (language) {
        partial.language = language
      }
      const updatedSettings = await window.api.settings.set(partial)
      setSettings(updatedSettings)

      // Save OpenAI key if provided
      if (openaiKey.trim()) {
        await window.api.secrets.setOpenAIKey(openaiKey.trim())
        setOpenaiKey('') // Clear input after saving
        const keyCheck = await window.api.secrets.hasOpenAIKey()
        setHasOpenaiKey(keyCheck.hasKey)
      }

      // Save OpenWeatherMap key if provided
      if (openWeatherMapKey.trim()) {
        const normalizedKey = normalizeOpenWeatherMapKey(openWeatherMapKey)
        if (!normalizedKey) {
          setError(
            'OpenWeatherMap API key looks invalid. Paste the 32-character key only.'
          )
          return
        }
        const result = await window.api.secrets.setOpenWeatherMapKey(normalizedKey)
        if (!result.success) {
          setError('Failed to save OpenWeatherMap API key. Please check and try again.')
          return
        }
        setOpenWeatherMapKey('') // Clear input after saving
        const keyCheck = await window.api.secrets.hasOpenWeatherMapKey()
        setHasOpenWeatherMapKey(keyCheck.hasKey)
        // Clear any previous errors if key was saved successfully
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleClearOpenAIKey = async (): Promise<void> => {
    try {
      await window.api.secrets.clearOpenAIKey()
      setHasOpenaiKey(false)
      setOpenaiKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API key')
    }
  }

  const handleClearOpenWeatherMapKey = async (): Promise<void> => {
    try {
      await window.api.secrets.clearOpenWeatherMapKey()
      setHasOpenWeatherMapKey(false)
      setOpenWeatherMapKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API key')
    }
  }

  const handleSearchCity = async (): Promise<void> => {
    if (!citySearch.trim()) {
      setError('Please enter a city name')
      return
    }
    setGeocoding(true)
    setError(null)
    setGeocodeResults([])
    try {
      const result = await window.api.weather.geocode({ query: citySearch.trim() })
      if (result.success) {
        setGeocodeResults(result.results)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search city')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSelectLocation = async (
    location: { name: string; country?: string; lat: number; lon: number }
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const updatedSettings = await window.api.settings.set({
        weatherLocation: location
      })
      setSettings(updatedSettings)
      setGeocodeResults([])
      setCitySearch('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  const handleTestApiKey = async (): Promise<void> => {
    if (!hasOpenWeatherMapKey) {
      setError('Please configure your OpenWeatherMap API key first')
      return
    }
    setTestingApiKey(true)
    setError(null)
    try {
      // Test by trying to geocode a simple city
      const result = await window.api.weather.geocode({ query: 'London' })
      if (result.success) {
        setError(null)
        alert('✅ API key is valid and working!')
      } else {
        if (result.error.includes('Invalid API key')) {
          setError(
            `API key test failed: ${result.error}\n\nPlease:\n1. Click "Clear API Key"\n2. Get a new API key from https://openweathermap.org/api\n3. Enter it and save again`
          )
        } else {
          setError(`API key test failed: ${result.error}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test API key')
    } finally {
      setTestingApiKey(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Settings</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

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

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3 style={{ marginTop: 0 }}>OpenAI API Key</h3>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            API Key:
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder={hasOpenaiKey ? 'Key already configured' : 'Enter API key'}
            />
            {hasOpenaiKey && (
              <span style={{ marginLeft: '10px', color: 'green' }}>Configured ✅</span>
            )}
          </label>
          {hasOpenaiKey && (
            <button
              onClick={handleClearOpenAIKey}
              style={{ marginTop: '5px', padding: '5px 10px' }}
            >
              Clear API Key
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3 style={{ marginTop: 0 }}>Weather Settings</h3>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            OpenWeatherMap API Key:
            <input
              type="password"
              value={openWeatherMapKey}
              onChange={(e) => setOpenWeatherMapKey(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder={
                hasOpenWeatherMapKey ? 'Key already configured' : 'Enter API key'
              }
            />
            {hasOpenWeatherMapKey && (
              <span style={{ marginLeft: '10px', color: 'green' }}>Configured ✅</span>
            )}
          </label>
          {hasOpenWeatherMapKey && (
            <div style={{ marginTop: '5px' }}>
              <button
                onClick={handleTestApiKey}
                disabled={testingApiKey}
                style={{
                  marginRight: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: testingApiKey ? 'not-allowed' : 'pointer'
                }}
              >
                {testingApiKey ? 'Testing...' : 'Test API Key'}
              </button>
              <button
                onClick={handleClearOpenWeatherMapKey}
                style={{ padding: '5px 10px' }}
              >
                Clear API Key
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Search City:
            <input
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchCity()
                }
              }}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder="Enter city name"
            />
            <button
              onClick={handleSearchCity}
              disabled={geocoding || !citySearch.trim()}
              style={{ marginLeft: '10px', padding: '5px 10px' }}
            >
              {geocoding ? 'Searching...' : 'Search'}
            </button>
          </label>
        </div>

        {geocodeResults.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Select location:</div>
            {geocodeResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleSelectLocation(result)}
                style={{
                  padding: '8px',
                  marginBottom: '5px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9e9e9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9f9f9'
                }}
              >
                {result.name}
                {result.country && `, ${result.country}`}
              </div>
            ))}
          </div>
        )}

        {settings?.weatherLocation && (
          <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f5e9' }}>
            <strong>Current location:</strong> {settings.weatherLocation.name}
            {settings.weatherLocation.country && `, ${settings.weatherLocation.country}`}
          </div>
        )}
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
          {settings.weatherLocation && (
            <div>
              Weather Location: {settings.weatherLocation.name}
              {settings.weatherLocation.country && `, ${settings.weatherLocation.country}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
