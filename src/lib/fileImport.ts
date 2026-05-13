// PR J11c — .fit and .tcx parsers.
//
// Common shape both formats reduce to so the API route can do a single
// uniform `training_logs` insert regardless of source.

import { XMLParser } from 'fast-xml-parser'

export interface ImportedActivity {
  source:        'fit' | 'tcx'
  start_time:    string                // ISO 8601
  distance_m:    number                // metres
  duration_secs: number
  avg_hr:        number | null
  name:          string | null
  splits:        Array<{ km: number; pace_secs: number | null; hr: number | null }>
}

// ── .fit (Garmin/Wahoo/Suunto binary) ───────────────────────────────────────
// Uses `fit-decoder` (288kB unpacked, zero deps). The library has no type
// definitions so we cast to `unknown` at the boundary.

interface FitSessionRecord {
  total_distance?:     number   // metres
  total_elapsed_time?: number   // seconds
  total_timer_time?:   number   // seconds (alt key)
  avg_heart_rate?:     number   // bpm
  start_time?:         string   // ISO
  sport?:              string
}

export async function parseFit(buffer: ArrayBuffer): Promise<ImportedActivity> {
  // fit-decoder ships no type definitions; cast at the import boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitDecoder = (await import('fit-decoder' as any)) as any
  const raw  = fitDecoder.fit2json(buffer)
  const json = fitDecoder.parseRecords(raw)

  // The session record carries the summary. .fit files always have exactly
  // one session record for an activity.
  const sessions: FitSessionRecord[] = fitDecoder.getRecords(json, 'session') ?? []
  const session = sessions[0]
  if (!session) {
    throw new Error('No session record found in .fit file')
  }

  const distance_m    = session.total_distance ?? 0
  const duration_secs = session.total_elapsed_time ?? session.total_timer_time ?? 0
  const avg_hr        = session.avg_heart_rate ?? null
  const start_time    = session.start_time ?? new Date().toISOString()

  return {
    source: 'fit',
    start_time,
    distance_m,
    duration_secs,
    avg_hr,
    name: session.sport ? `${session.sport} (FIT)` : 'Imported run (FIT)',
    splits: [],
  }
}

// ── .tcx (Garmin Training Center XML) ───────────────────────────────────────

interface TcxLap {
  TotalTimeSeconds?: number
  DistanceMeters?:   number
  AverageHeartRateBpm?: { Value?: number } | number
  '@_StartTime'?:    string
}

interface TcxActivity {
  '@_Sport'?: string
  Id?:        string
  Lap?:       TcxLap | TcxLap[]
}

interface TcxTrainingCenterDatabase {
  TrainingCenterDatabase?: {
    Activities?: { Activity?: TcxActivity | TcxActivity[] }
  }
}

export function parseTcx(xmlText: string): ImportedActivity {
  const parser = new XMLParser({
    ignoreAttributes:    false,
    parseAttributeValue: true,
    parseTagValue:       true,
    attributeNamePrefix: '@_',
  })
  const parsed = parser.parse(xmlText) as TcxTrainingCenterDatabase

  const activityRaw = parsed.TrainingCenterDatabase?.Activities?.Activity
  const activity = Array.isArray(activityRaw) ? activityRaw[0] : activityRaw
  if (!activity) {
    throw new Error('No <Activity> element found in .tcx file')
  }

  const laps: TcxLap[] = Array.isArray(activity.Lap)
    ? activity.Lap
    : activity.Lap ? [activity.Lap] : []
  if (laps.length === 0) {
    throw new Error('No <Lap> elements found in .tcx file')
  }

  let distance_m = 0
  let duration_secs = 0
  let hrSum = 0
  let hrCount = 0
  const splits: ImportedActivity['splits'] = []

  for (const lap of laps) {
    const d = Number(lap.DistanceMeters ?? 0)
    const t = Number(lap.TotalTimeSeconds ?? 0)
    distance_m    += d
    duration_secs += t
    let hr: number | null = null
    if (lap.AverageHeartRateBpm) {
      const v = typeof lap.AverageHeartRateBpm === 'number'
        ? lap.AverageHeartRateBpm
        : Number(lap.AverageHeartRateBpm.Value ?? 0)
      if (v > 0) { hr = v; hrSum += v; hrCount += 1 }
    }
    if (d > 0 && t > 0) {
      splits.push({
        km:        Math.round((d / 1000) * 10) / 10,
        pace_secs: Math.round(t / (d / 1000)),
        hr,
      })
    }
  }

  const start_time = activity.Id ?? laps[0]?.['@_StartTime'] ?? new Date().toISOString()
  const avg_hr    = hrCount > 0 ? Math.round(hrSum / hrCount) : null

  return {
    source: 'tcx',
    start_time,
    distance_m,
    duration_secs,
    avg_hr,
    name: activity['@_Sport'] ? `${activity['@_Sport']} (TCX)` : 'Imported run (TCX)',
    splits,
  }
}

// ── Format detection ────────────────────────────────────────────────────────

export function detectFormat(filename: string, firstBytes: Uint8Array): 'fit' | 'tcx' | null {
  const name = filename.toLowerCase()
  if (name.endsWith('.fit')) return 'fit'
  if (name.endsWith('.tcx')) return 'tcx'
  // Fallback: .fit files start with .FIT header byte sequence at offset 8.
  // TCX is XML, starts with '<' or BOM-then-'<'.
  if (firstBytes.length > 12) {
    const fitMagic = String.fromCharCode(...firstBytes.slice(8, 12))
    if (fitMagic === '.FIT') return 'fit'
  }
  if (firstBytes[0] === 0x3c /* '<' */ || (firstBytes[0] === 0xEF && firstBytes[1] === 0xBB)) {
    return 'tcx'
  }
  return null
}
