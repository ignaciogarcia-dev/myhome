import React, { useState, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'

interface WeatherData {
  current: {
    temp: number
    feelsLike: number
    description: string
    humidity: number
    wind: number
    icon: string
    sunrise: number
    sunset: number
    uvi?: number
    pressure?: number
  }
  daily: Array<{
    date: number
    min: number
    max: number
    description: string
    icon: string
  }>
}

/**
 * Weather Screen - Displays current weather and weekly forecast
 */
export default function WeatherScreen(): React.JSX.Element {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [hasLocation, setHasLocation] = useState<boolean>(false)

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = async (): Promise<void> => {
      try {
        const [keyCheck, settings] = await Promise.all([
          window.api.secrets.hasOpenWeatherMapKey(),
          window.api.settings.get()
        ])
        setHasApiKey(keyCheck.hasKey)
        setHasLocation(!!settings.weatherLocation)
      } catch (err) {
        console.error('Failed to check config:', err)
      }
    }
    checkConfig()
  }, [])

  // Load weather data
  const loadWeather = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.weather.getWeather()
      if (result.success) {
        setWeather({
          current: result.current,
          daily: result.daily
        })
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather')
    } finally {
      setLoading(false)
    }
  }

  // Load weather on mount if configured
  useEffect(() => {
    if (hasApiKey && hasLocation) {
      loadWeather()
    }
  }, [hasApiKey, hasLocation])

  // Format time from timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana'
    }
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  // Get weather icon URL
  const getIconUrl = (icon: string): string => {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`
  }

  if (!hasApiKey || !hasLocation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto pb-6 text-center">
        <div className="ha-card w-full max-w-xl p-6">
          <p className="ha-label">Weather</p>
          <h2 className="ha-title mt-2">Setup needed</h2>
          <p className="ha-subtitle mt-2">
            Finish the setup in Settings to unlock live forecasts.
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            {!hasApiKey && (
              <div className="rounded-2xl bg-amber-50/80 p-4">
                <strong>OpenWeatherMap API key not configured.</strong>
                <div className="mt-1">Please add it in Settings.</div>
              </div>
            )}
            {!hasLocation && (
              <div className="rounded-2xl bg-amber-50/80 p-4">
                <strong>Weather location not configured.</strong>
                <div className="mt-1">Search and select a city in Settings.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const metrics = weather
    ? [
        { label: 'Feels like', value: `${weather.current.feelsLike}°C` },
        { label: 'Humidity', value: `${weather.current.humidity}%` },
        { label: 'Wind', value: `${weather.current.wind} km/h` },
        ...(weather.current.pressure
          ? [{ label: 'Pressure', value: `${weather.current.pressure} hPa` }]
          : []),
        ...(weather.current.uvi !== undefined
          ? [{ label: 'UV Index', value: `${weather.current.uvi}` }]
          : []),
        { label: 'Sunrise', value: formatTime(weather.current.sunrise) },
        { label: 'Sunset', value: formatTime(weather.current.sunset) }
      ]
    : []

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="ha-label">Weather</p>
          <h2 className="ha-title">Forecast</h2>
          <p className="ha-subtitle">Live conditions with a 7-day outlook.</p>
        </div>
        <button
          type="button"
          onClick={loadWeather}
          disabled={loading}
          className="ha-button-secondary"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ha-card border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
          Error: {error}
        </div>
      )}

      {weather && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div
            onClick={() => setSelectedDay(null)}
            className="ha-card cursor-pointer p-6 animate-fade-up"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="ha-label">Current</div>
                <div className="mt-2 text-4xl font-semibold text-slate-900">
                  {weather.current.temp}°C
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {weather.current.description}
                </div>
              </div>
              <img
                src={getIconUrl(weather.current.icon)}
                alt={weather.current.description}
                className="h-24 w-24 drop-shadow-[0_12px_20px_rgba(15,23,42,0.2)]"
              />
            </div>
            {selectedDay === null && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-white/70 p-3">
                    <div className="ha-label">{metric.label}</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ha-card p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">7-Day Forecast</div>
              <span className="ha-tag">Tap a day</span>
            </div>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-3 pr-2">
              {weather.daily.map((day, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                  className={cn(
                    'min-w-[170px] flex-shrink-0 cursor-pointer rounded-2xl border border-white/80 bg-white/75 p-4 text-center shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] transition hover:bg-white/95',
                    selectedDay === index && 'bg-sky-50/90 ring-2 ring-sky-200'
                  )}
                >
                  <div className="text-sm font-semibold text-slate-700">
                    {formatDate(day.date)}
                  </div>
                  <img
                    src={getIconUrl(day.icon)}
                    alt={day.description}
                    className="mx-auto my-3 h-14 w-14"
                  />
                  <div className="text-xs text-slate-500">{day.description}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {day.max}°C
                  </div>
                  <div className="text-xs text-slate-400">{day.min}°C</div>
                  {selectedDay === index && (
                    <div className="mt-3 rounded-2xl bg-white/80 p-3 text-left text-xs text-slate-600">
                      <div>
                        <strong>High:</strong> {day.max}°C
                      </div>
                      <div>
                        <strong>Low:</strong> {day.min}°C
                      </div>
                      <div>
                        <strong>Condition:</strong> {day.description}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && !weather && (
        <div className="ha-card p-6 text-center text-sm text-slate-500">
          Loading weather data...
        </div>
      )}
    </div>
  )
}
