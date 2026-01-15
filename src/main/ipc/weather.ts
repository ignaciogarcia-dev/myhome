/**
 * Weather IPC Handlers
 *
 * Handles weather data retrieval from OpenWeatherMap API.
 * Uses Current Weather API 2.5 and 5 Day / 3 Hour Forecast API 2.5 (Free plan compatible).
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap } from '../../shared'
import { getCurrentSettings } from './settings'
import { getOpenWeatherMapKey } from './secrets'

// Cache for weather data (5 minutes TTL)
interface CachedWeather {
  data: InvokeMap[typeof CHANNELS.invoke.WEATHER_GET_WEATHER]['res']
  timestamp: number
}

let weatherCache: CachedWeather | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Clear weather cache (exported for potential future use)
 */
export function clearWeatherCache(): void {
  weatherCache = null
}

/**
 * Get cached weather if still valid
 */
function getCachedWeather():
  | InvokeMap[typeof CHANNELS.invoke.WEATHER_GET_WEATHER]['res']
  | null {
  if (weatherCache && Date.now() - weatherCache.timestamp < CACHE_TTL) {
    return weatherCache.data
  }
  return null
}

/**
 * Geocode city name to coordinates using OpenWeatherMap Geocoding API
 */
async function geocodeCity(query: string): Promise<
  | {
      success: true
      results: Array<{
        name: string
        country?: string
        lat: number
        lon: number
      }>
    }
  | { success: false; error: string }
> {
  const apiKey = await getOpenWeatherMapKey()
  if (!apiKey) {
    return { success: false, error: 'OpenWeatherMap API key not configured' }
  }

  // Trim and validate API key
  const trimmedKey = apiKey.trim()
  if (!trimmedKey || trimmedKey.length < 20) {
    console.error('API key validation failed. Length:', trimmedKey.length)
    return {
      success: false,
      error: 'API key appears to be invalid. Please check your OpenWeatherMap API key.'
    }
  }

  // Log partial key for debugging (first 4 and last 4 chars)
  const keyPreview = trimmedKey.length >= 8 
    ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)}`
    : 'too short'
  console.log(`Geocoding request - Query: "${query}", API Key: ${keyPreview} (length: ${trimmedKey.length})`)

  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      query
    )}&limit=5&appid=${trimmedKey}`
    
    console.log('Geocoding URL (without key):', url.replace(trimmedKey, '***'))
    
    // Add timeout to fetch (10 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      console.log('Geocoding response status:', response.status, response.statusText)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { success: false, error: 'Request timeout. Please check your internet connection and try again.' }
      }
      throw fetchError
    }

    if (!response.ok) {
      let errorText = ''
      try {
        errorText = await response.text()
        console.error('OpenWeatherMap API error response:', errorText)
      } catch {
        // Ignore if we can't read error text
      }
      
      if (response.status === 401) {
        console.error('OpenWeatherMap API returned 401. Error text:', errorText)
        console.error('API Key used (first 4, last 4):', keyPreview)
        console.error('API Key length:', trimmedKey.length)
        
        // Try to parse error message for more details
        let detailedError = 'Invalid API key. Please verify your OpenWeatherMap API key in Settings.'
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            detailedError = `Invalid API key: ${errorJson.message}. Please verify your OpenWeatherMap API key in Settings.`
          }
        } catch {
          // If not JSON, use the error text as is
          if (errorText) {
            detailedError = `Invalid API key: ${errorText}. Please verify your OpenWeatherMap API key in Settings.`
          }
        }
        
        return {
          success: false,
          error: detailedError
        }
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' }
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
      }
    }

    const data = (await response.json()) as Array<{
      name: string
      country?: string
      lat: number
      lon: number
      state?: string
    }>

    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'No locations found' }
    }

    const results = data.map((item) => ({
      name: item.name + (item.state ? `, ${item.state}` : ''),
      country: item.country,
      lat: item.lat,
      lon: item.lon
    }))

    return { success: true, results }
  } catch (err) {
    console.error('Geocoding error:', err)
    if (err instanceof Error) {
      if (err.message.includes('ETIMEDOUT') || err.message.includes('timeout')) {
        return {
          success: false,
          error: 'Connection timeout. Please check your internet connection and try again.'
        }
      }
      if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        return {
          success: false,
          error: 'Cannot reach OpenWeatherMap servers. Please check your internet connection.'
        }
      }
      return {
        success: false,
        error: `Network error: ${err.message}`
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your internet connection.'
    }
  }
}

/**
 * Get weather data from OpenWeatherMap API 2.5 (Free plan)
 * Uses Current Weather API and 5 Day / 3 Hour Forecast API
 */
async function getWeatherData(): Promise<
  | {
      success: true
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
  | { success: false; error: string }
> {
  // Check cache first
  const cached = getCachedWeather()
  if (cached && 'success' in cached && cached.success) {
    return cached
  }

  const apiKey = await getOpenWeatherMapKey()
  if (!apiKey) {
    return { success: false, error: 'OpenWeatherMap API key not configured' }
  }

  // Trim and validate API key
  const trimmedKey = apiKey.trim()
  if (!trimmedKey || trimmedKey.length < 20) {
    return {
      success: false,
      error: 'API key appears to be invalid. Please check your OpenWeatherMap API key.'
    }
  }

  const settings = getCurrentSettings()
  if (!settings.weatherLocation) {
    return { success: false, error: 'Weather location not configured' }
  }

  const { lat, lon } = settings.weatherLocation
  const units = settings.weatherUnits || 'metric'
  const lang = settings.weatherLang || 'es'

  try {
    // Fetch current weather and forecast in parallel with timeout
    const controller1 = new AbortController()
    const controller2 = new AbortController()
    const timeoutId1 = setTimeout(() => controller1.abort(), 10000)
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000)

    let currentResponse: Response
    let forecastResponse: Response

    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${trimmedKey}&units=${units}&lang=${lang}`,
          { signal: controller1.signal }
        ),
        fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${trimmedKey}&units=${units}&lang=${lang}`,
          { signal: controller2.signal }
        )
      ])
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      currentResponse = currentRes
      forecastResponse = forecastRes
    } catch (fetchError) {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please check your internet connection and try again.'
        }
      }
      throw fetchError
    }

    // Check current weather response
    if (!currentResponse.ok) {
      let errorText = ''
      try {
        errorText = await currentResponse.text()
      } catch {
        // Ignore if we can't read error text
      }
      
      if (currentResponse.status === 401) {
        console.error('OpenWeatherMap Current Weather API returned 401. Error text:', errorText)
        return {
          success: false,
          error: 'Invalid API key. Please verify your OpenWeatherMap API key in Settings.'
        }
      }
      if (currentResponse.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' }
      }
      return {
        success: false,
        error: `Current weather API error: ${currentResponse.status} ${currentResponse.statusText}${errorText ? ` - ${errorText}` : ''}`
      }
    }

    // Check forecast response
    if (!forecastResponse.ok) {
      let errorText = ''
      try {
        errorText = await forecastResponse.text()
      } catch {
        // Ignore if we can't read error text
      }
      
      if (forecastResponse.status === 401) {
        console.error('OpenWeatherMap Forecast API returned 401. Error text:', errorText)
        return {
          success: false,
          error: 'Invalid API key. Please verify your OpenWeatherMap API key in Settings.'
        }
      }
      if (forecastResponse.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' }
      }
      return {
        success: false,
        error: `Forecast API error: ${forecastResponse.status} ${forecastResponse.statusText}${errorText ? ` - ${errorText}` : ''}`
      }
    }

    const currentData = (await currentResponse.json()) as {
      main: {
        temp: number
        feels_like: number
        humidity: number
        pressure: number
      }
      weather: Array<{ description: string; icon: string }>
      wind: { speed: number }
      sys: { sunrise: number; sunset: number }
    }

    const forecastData = (await forecastResponse.json()) as {
      list: Array<{
        dt: number
        main: {
          temp: number
          temp_min: number
          temp_max: number
        }
        weather: Array<{ description: string; icon: string }>
      }>
    }

    // Process current weather
    const currentWeather = currentData.weather[0]
    const current = {
      temp: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      description: currentWeather.description,
      humidity: currentData.main.humidity,
      wind: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      icon: currentWeather.icon,
      sunrise: currentData.sys.sunrise * 1000, // Convert to milliseconds
      sunset: currentData.sys.sunset * 1000,
      pressure: currentData.main.pressure
    }

    // Process forecast: group 3-hour intervals by day and calculate min/max
    const dailyMap = new Map<
      string,
      {
        date: number
        temps: number[]
        descriptions: Array<{ description: string; icon: string }>
      }
    >()

    forecastData.list.forEach((item) => {
      const date = new Date(item.dt * 1000)
      // Use local date to group by day correctly
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      if (!dailyMap.has(dayKey)) {
        // Set date to start of day in local timezone
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        dailyMap.set(dayKey, {
          date: dayStart.getTime(),
          temps: [],
          descriptions: []
        })
      }

      const dayData = dailyMap.get(dayKey)!
      dayData.temps.push(item.main.temp_min, item.main.temp_max)
      dayData.descriptions.push(item.weather[0])
    })

    // Convert to daily array, taking most common description/icon for each day
    const daily = Array.from(dailyMap.values())
      .slice(0, 7)
      .map((dayData) => {
        const min = Math.round(Math.min(...dayData.temps))
        const max = Math.round(Math.max(...dayData.temps))

        // Get most common description/icon (or first one if all different)
        const descriptionCounts = new Map<string, number>()
        dayData.descriptions.forEach((desc) => {
          const key = `${desc.description}|${desc.icon}`
          descriptionCounts.set(key, (descriptionCounts.get(key) || 0) + 1)
        })

        let mostCommon = dayData.descriptions[0]
        let maxCount = 0
        descriptionCounts.forEach((count, key) => {
          if (count > maxCount) {
            maxCount = count
            const [description, icon] = key.split('|')
            mostCommon = { description, icon }
          }
        })

        return {
          date: dayData.date,
          min,
          max,
          description: mostCommon.description,
          icon: mostCommon.icon
        }
      })

    const weatherResponse = {
      success: true as const,
      current,
      daily
    }

    // Cache the response
    weatherCache = {
      data: weatherResponse,
      timestamp: Date.now()
    }

    return weatherResponse
  } catch (err) {
    console.error('Weather API error:', err)
    if (err instanceof Error) {
      if (err.message.includes('ETIMEDOUT') || err.message.includes('timeout')) {
        return {
          success: false,
          error: 'Connection timeout. Please check your internet connection and try again.'
        }
      }
      if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        return {
          success: false,
          error: 'Cannot reach OpenWeatherMap servers. Please check your internet connection.'
        }
      }
      return {
        success: false,
        error: `Network error: ${err.message}`
      }
    }
    return {
      success: false,
      error: 'Network error. Please check your internet connection.'
    }
  }
}

/**
 * Register weather IPC handlers
 */
export function registerWeatherHandlers(): void {
  // Geocode city name to coordinates
  ipcMain.handle(
    CHANNELS.invoke.WEATHER_GEOCODE,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.WEATHER_GEOCODE]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.WEATHER_GEOCODE]['res']> => {
      return await geocodeCity(request.query)
    }
  )

  // Get current weather and forecast
  ipcMain.handle(
    CHANNELS.invoke.WEATHER_GET_WEATHER,
    async (): Promise<InvokeMap[typeof CHANNELS.invoke.WEATHER_GET_WEATHER]['res']> => {
      return await getWeatherData()
    }
  )

  // Clear cache when settings change (we'll call this from settings handler)
  // For now, cache will expire naturally
}
