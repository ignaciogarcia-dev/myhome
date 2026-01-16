import React, { useState, useEffect } from 'react'
import type { Settings } from '@shared/types/settings'
import { cn } from '@renderer/lib/utils'

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
  const hasCityQuery = citySearch.trim().length > 0
  const openaiStatusTone = hasOpenaiKey
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-200 text-slate-500'
  const weatherStatusTone = hasOpenWeatherMapKey
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-200 text-slate-500'

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
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      <div className="space-y-2">
        <p className="ha-label">Preferences</p>
        <h2 className="ha-title">Settings</h2>
        <p className="ha-subtitle">Tune your experience, language, and integrations.</p>
      </div>

      {error && (
        <div className="ha-card border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
          Error: {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ha-card p-6 animate-fade-up">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-700">General</div>
            <p className="ha-subtitle">Adjust the local interface defaults.</p>
          </div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="theme-input" className="text-sm font-semibold text-slate-700">
                Theme
              </label>
              <input
                id="theme-input"
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="ha-input"
                placeholder="light, dark, or auto"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="language-input" className="text-sm font-semibold text-slate-700">
                Language
              </label>
              <input
                id="language-input"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="ha-input"
                placeholder="en, es, etc."
              />
            </div>
          </div>
        </div>

        <div
          className="ha-card p-6 animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-700">OpenAI API Key</div>
              <p className="ha-subtitle">Secure key for assistant features.</p>
            </div>
            <span className={cn('ha-pill', openaiStatusTone)}>
              {hasOpenaiKey ? 'Configured' : 'Missing'}
            </span>
          </div>
          <div className="mt-5 space-y-2">
            <label htmlFor="openai-key" className="text-sm font-semibold text-slate-700">
              API Key
            </label>
            <input
              id="openai-key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="ha-input"
              placeholder={hasOpenaiKey ? 'Key already configured' : 'Enter API key'}
            />
          </div>
          {hasOpenaiKey && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleClearOpenAIKey}
                className="ha-button-secondary"
              >
                Clear API Key
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="ha-card space-y-6 p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-700">Weather</div>
            <p className="ha-subtitle">
              Configure OpenWeatherMap access and your default location.
            </p>
          </div>
          <span className={cn('ha-pill', weatherStatusTone)}>
            {hasOpenWeatherMapKey ? 'Configured' : 'Missing'}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-2">
            <label htmlFor="weather-key" className="text-sm font-semibold text-slate-700">
              OpenWeatherMap API Key
            </label>
            <input
              id="weather-key"
              type="password"
              value={openWeatherMapKey}
              onChange={(e) => setOpenWeatherMapKey(e.target.value)}
              className="ha-input"
              placeholder={hasOpenWeatherMapKey ? 'Key already configured' : 'Enter API key'}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {hasOpenWeatherMapKey && (
              <>
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={testingApiKey}
                  className="ha-button"
                >
                  {testingApiKey ? 'Testing...' : 'Test API Key'}
                </button>
                <button
                  type="button"
                  onClick={handleClearOpenWeatherMapKey}
                  className="ha-button-secondary"
                >
                  Clear API Key
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ha-divider" />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-2">
            <label htmlFor="city-search" className="text-sm font-semibold text-slate-700">
              Search City
            </label>
            <input
              id="city-search"
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchCity()
                }
              }}
              className="ha-input"
              placeholder="Enter city name"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearchCity}
              disabled={geocoding || !hasCityQuery}
              className="ha-button-secondary w-full"
            >
              {geocoding ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {geocodeResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">Select location</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {geocodeResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectLocation(result)}
                  className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)] transition hover:bg-white/90"
                >
                  {result.name}
                  {result.country && `, ${result.country}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {settings?.weatherLocation && (
          <div className="rounded-2xl bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <strong>Current location:</strong> {settings.weatherLocation.name}
            {settings.weatherLocation.country && `, ${settings.weatherLocation.country}`}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={handleSave} disabled={loading} className="ha-button">
          {loading ? 'Saving...' : 'Save'}
        </button>
        <span className="text-sm text-slate-500">Changes persist locally.</span>
      </div>

      {settings && (
        <div className="ha-card p-6 text-sm text-slate-600 animate-fade-up">
          <div className="text-sm font-semibold text-slate-700">Current Settings</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        </div>
      )}
    </div>
  )
}
