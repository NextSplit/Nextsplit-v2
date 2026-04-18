'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
  temp: number
  feels_like: number
  condition: string
  wind_kph: number
  humidity: number
  icon: string
  paceNote: string | null
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '❄️'
  return '⛈️'
}

function getCondition(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorm'
}

function getPaceNote(temp: number, windKph: number, code: number): string | null {
  const notes = []
  if (temp >= 22) notes.push(`+${Math.round((temp - 20) * 0.4 * 10) / 10}min/km heat penalty`)
  if (temp <= 2) notes.push('Cold — warm up fully')
  if (windKph >= 30) notes.push(`${windKph}kph wind — add 20s/km into headwind`)
  if (code >= 61 && code <= 82) notes.push('Wet — shoes may be heavy')
  return notes.length > 0 ? notes.join(' · ') : null
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Get location
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        )
        const { latitude, longitude } = pos.coords

        // Open-Meteo free API — no key needed
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`
        const res = await fetch(url)
        const data = await res.json()
        const c = data.current

        setWeather({
          temp: Math.round(c.temperature_2m),
          feels_like: Math.round(c.apparent_temperature),
          condition: getCondition(c.weather_code),
          wind_kph: Math.round(c.wind_speed_10m),
          humidity: c.relative_humidity_2m,
          icon: getWeatherIcon(c.weather_code),
          paceNote: getPaceNote(c.temperature_2m, c.wind_speed_10m, c.weather_code),
        })
      } catch {
        // Silent fail — weather is optional
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [])

  if (loading || !weather) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{weather.icon}</span>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{weather.temp}°C</span>
              <span className="text-xs text-gray-400">feels {weather.feels_like}°</span>
            </div>
            <div className="text-xs text-gray-500">{weather.condition}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-400 space-y-0.5">
          <div>💨 {weather.wind_kph} kph</div>
          <div>💧 {weather.humidity}%</div>
        </div>
      </div>

      {weather.paceNote && (
        <div className="mt-2.5 flex items-start gap-1.5 bg-amber-50 rounded-xl px-3 py-2">
          <span className="text-sm">⚡</span>
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">{weather.paceNote}</p>
        </div>
      )}
    </div>
  )
}
