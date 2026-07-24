import { describe, it, expect, vi, afterEach } from 'vitest'
import { timezoneOptions, formatZoneAbbr, countdown, liveState } from '../src/utils/time.js'

afterEach(() => vi.restoreAllMocks())

describe('timezoneOptions', () => {
  it('returns the known list as-is, but prepends an unknown current zone', () => {
    expect(timezoneOptions('UTC')).toContainEqual({ id: 'UTC', label: 'UTC' })
    const opts = timezoneOptions('Mars/Phobos_Base')
    expect(opts[0]).toEqual({ id: 'Mars/Phobos_Base', label: 'Phobos Base' })
    expect(opts.length).toBeGreaterThan(1)
  })
})

describe('formatZoneAbbr', () => {
  it('returns an empty string when no timeZoneName part is present', () => {
    // Force Intl to yield parts without a timeZoneName so the `?.value || ''` fallback runs.
    vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
      { type: 'literal', value: 'x' },
    ])
    expect(formatZoneAbbr('2026-03-19T17:00:00.000Z', 'UTC')).toBe('')
  })
})

describe('countdown', () => {
  const now = new Date('2026-03-19T12:00:00.000Z').getTime()
  const inMinutes = (m) => new Date(now + m * 60000).toISOString()

  it('formats days, hours, and minutes, and returns null once elapsed', () => {
    expect(countdown(inMinutes(26 * 60), now)).toBe('1d 2h') // days branch
    expect(countdown(inMinutes(90), now)).toBe('1h 30m') // hours branch
    expect(countdown(inMinutes(30), now)).toBe('30m') // minutes-only branch
    expect(countdown(inMinutes(-5), now)).toBeNull() // already started
  })
})

describe('liveState', () => {
  // A scoreless game whose tip has passed but is still inside the ~2.25h game window
  // reads as possibly in progress; once the window closes it reads as past. Pinning
  // `now` relative to the tip keeps both arms deterministic (no wall-clock flake).
  const tip = '2026-03-19T17:00:00.000Z'
  const start = new Date(tip).getTime()

  it('flags a scoreless game inside the game window as likely-live', () => {
    expect(liveState({ tip }, start + 60 * 60 * 1000)).toBe('likely-live')
  })

  it('treats a scoreless game past the window as past', () => {
    expect(liveState({ tip }, start + 3 * 60 * 60 * 1000)).toBe('past')
  })
})
