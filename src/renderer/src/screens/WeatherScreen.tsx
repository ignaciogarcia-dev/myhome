import React, { useState, useEffect } from 'react'

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
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Weather</h2>
        <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
          {!hasApiKey && (
            <div style={{ marginBottom: '10px' }}>
              <strong>OpenWeatherMap API key not configured.</strong>
              <br />
              Please configure it in Settings.
            </div>
          )}
          {!hasLocation && (
            <div>
              <strong>Weather location not configured.</strong>
              <br />
              Please search and select a location in Settings.
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Weather</h2>
        <button
          onClick={loadWeather}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px'
          }}
        >
          Error: {error}
        </div>
      )}

      {weather && (
        <>
          {/* Current Weather Card */}
          <div
            onClick={() => setSelectedDay(null)}
            style={{
              marginTop: '20px',
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0' }}>Current Weather</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                  {weather.current.temp}°C
                </div>
                <div style={{ fontSize: '18px', color: '#666', marginTop: '5px' }}>
                  {weather.current.description}
                </div>
              </div>
              <img
                src={getIconUrl(weather.current.icon)}
                alt={weather.current.description}
                style={{ width: '100px', height: '100px' }}
              />
            </div>
            {selectedDay === null && (
              <div
                style={{
                  marginTop: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '10px'
                }}
              >
                <div>
                  <strong>Feels like:</strong> {weather.current.feelsLike}°C
                </div>
                <div>
                  <strong>Humidity:</strong> {weather.current.humidity}%
                </div>
                <div>
                  <strong>Wind:</strong> {weather.current.wind} km/h
                </div>
                {weather.current.pressure && (
                  <div>
                    <strong>Pressure:</strong> {weather.current.pressure} hPa
                  </div>
                )}
                {weather.current.uvi !== undefined && (
                  <div>
                    <strong>UV Index:</strong> {weather.current.uvi}
                  </div>
                )}
                <div>
                  <strong>Sunrise:</strong> {formatTime(weather.current.sunrise)}
                </div>
                <div>
                  <strong>Sunset:</strong> {formatTime(weather.current.sunset)}
                </div>
              </div>
            )}
          </div>

          {/* Weekly Forecast */}
          <div style={{ marginTop: '20px' }}>
            <h3>7-Day Forecast</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '15px'
              }}
            >
              {weather.daily.map((day, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                  style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: selectedDay === index ? '#e3f2fd' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDay !== index) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDay !== index) {
                      e.currentTarget.style.backgroundColor = '#fff'
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {formatDate(day.date)}
                  </div>
                  <img
                    src={getIconUrl(day.icon)}
                    alt={day.description}
                    style={{ width: '60px', height: '60px', margin: '10px 0' }}
                  />
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    {day.description}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {day.max}°C
                  </div>
                  <div style={{ fontSize: '14px', color: '#999' }}>{day.min}°C</div>
                  {selectedDay === index && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textAlign: 'left'
                      }}
                    >
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
        </>
      )}

      {loading && !weather && (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading weather data...</div>
      )}
    </div>
  )
}
