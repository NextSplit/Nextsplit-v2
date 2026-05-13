// PR J12 — OpenWeatherMap one-call wrapper.
//
// Free tier: 1000 calls/day. Each call returns current + 48h hourly +
// 7d daily forecasts. We use the hourly slice for pre-run briefs.
//
// Graceful no-op when OPENWEATHER_API_KEY is missing — getWeather()
// returns null and callers render a "weather unavailable" state.

export interface WeatherSnapshot {
  temp_c:        number
  feels_like_c:  number
  humidity_pct:  number
  wind_kph:      number
  wind_dir_deg:  number
  condition:     string         // 'clear' | 'clouds' | 'rain' | 'snow' | ...
  description:   string         // human-readable
  icon:          string         // OWM icon code
  ts:            number         // unix seconds
}

export interface WeatherAdvice {
  pace_adjust:   string | null  // e.g. "drop pace by 8s/km"
  warning:       string | null  // e.g. "Strong headwind on out-leg"
  layering:      string | null  // e.g. "Long sleeves + tights"
}

export async function getWeather(lat: number, lon: number, atTs?: number): Promise<WeatherSnapshot | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 3600 } })  // 1h ISR cache
    if (!res.ok) return null
    const data = await res.json() as {
      current: WeatherApiHour
      hourly:  WeatherApiHour[]
    }
    const target = atTs
      ? data.hourly.find(h => Math.abs(h.dt - atTs) < 1800) ?? data.current
      : data.current
    return snapshotFromHour(target)
  } catch {
    return null
  }
}

interface WeatherApiHour {
  dt:         number
  temp:       number
  feels_like: number
  humidity:   number
  wind_speed: number      // m/s
  wind_deg:   number
  weather:    Array<{ main: string; description: string; icon: string }>
}

function snapshotFromHour(h: WeatherApiHour): WeatherSnapshot {
  const w = h.weather[0] ?? { main: 'clear', description: 'clear', icon: '01d' }
  return {
    temp_c:       Math.round(h.temp * 10) / 10,
    feels_like_c: Math.round(h.feels_like * 10) / 10,
    humidity_pct: h.humidity,
    wind_kph:     Math.round(h.wind_speed * 3.6 * 10) / 10,
    wind_dir_deg: h.wind_deg,
    condition:    w.main.toLowerCase(),
    description:  w.description,
    icon:         w.icon,
    ts:           h.dt,
  }
}

/**
 * Running-specific advice computed from a forecast snapshot.
 * Heuristics tuned for UK climate where most NextSplit users live.
 */
export function getWeatherAdvice(w: WeatherSnapshot): WeatherAdvice {
  let paceAdjust: string | null = null
  let warning:    string | null = null
  let layering:   string | null = null

  // Pace adjustment: heat slows pace ~3-4 s/km per °C over 16°C.
  if (w.temp_c > 22) {
    const adj = Math.round((w.temp_c - 16) * 3)
    paceAdjust = `Add ${adj}s/km to easy pace, ${Math.round(adj * 0.7)}s/km to threshold.`
  } else if (w.temp_c < 0) {
    paceAdjust = 'Start 30s/km slower than target — let the body warm up.'
  }

  // Wind: 15+ kph is a noticeable headwind.
  if (w.wind_kph >= 25) {
    warning = `Strong winds (${Math.round(w.wind_kph)} kph). Plan an out-and-back so headwind hits when fresh.`
  } else if (w.wind_kph >= 15) {
    warning = `Wind ${Math.round(w.wind_kph)} kph — into the wind first if possible.`
  }

  // Layering
  if (w.feels_like_c >= 18) {
    layering = 'Vest + shorts. Carry water.'
  } else if (w.feels_like_c >= 10) {
    layering = 'T-shirt + shorts.'
  } else if (w.feels_like_c >= 3) {
    layering = 'Long sleeves + shorts or tights.'
  } else if (w.feels_like_c >= -3) {
    layering = 'Long sleeves + tights + light gloves.'
  } else {
    layering = 'Base + mid layer + tights + gloves + buff.'
  }

  // Conditions overlay
  if (w.condition === 'rain') {
    layering = `${layering} Lightweight rain jacket.`
  }
  if (w.condition === 'snow') {
    warning = `${warning ?? ''} ${warning ? '· ' : ''}Surface frost/ice — slow pace, watch footing.`.trim()
  }

  return { pace_adjust: paceAdjust, warning, layering }
}
