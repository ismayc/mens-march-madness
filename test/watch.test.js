import { describe, it, expect } from 'vitest'
import {
  watchableServices,
  broadcastNotBadged,
  SERVICE_CATALOG,
  SERVICE_BY_KEY,
} from '../src/utils/watch.js'

const labels = (b, keys) => watchableServices(b, keys).map((s) => s.label)

describe('watchableServices', () => {
  it('matches a live-TV bundle via the national networks it carries', () => {
    expect(labels(['CBS'], ['youtubetv'])).toEqual(['YouTube TV'])
    expect(labels(['truTV'], ['youtubetv'])).toEqual(['YouTube TV'])
  })

  it('matches streaming exclusives by name', () => {
    // Max streams the Turner games; Paramount+ streams the CBS games.
    expect(labels(['Max', 'TNT'], ['max'])).toEqual(['Max'])
    expect(labels(['Paramount+', 'CBS'], ['paramount'])).toEqual(['Paramount+'])
  })

  it('only reports services the viewer has selected', () => {
    // The game is on CBS, but the viewer only has Max (Turner-only).
    expect(labels(['CBS'], ['max'])).toEqual([])
    // Selecting YouTube TV surfaces it.
    expect(labels(['CBS'], ['max', 'youtubetv'])).toEqual(['YouTube TV'])
  })

  it('lists every selected service that carries the game, in catalog order', () => {
    // A CBS game, viewer has both a bundle and the CBS streamer.
    expect(labels(['CBS', 'Paramount+'], ['youtubetv', 'paramount'])).toEqual([
      'Paramount+',
      'YouTube TV',
    ])
  })

  it('lists ALL of a viewer’s many services that carry the game — never capped', () => {
    // A Turner (TNT) game and a viewer with many services: every one that carries TNT is
    // returned, not a truncated subset, in catalog order.
    expect(labels(['TNT'], ['youtubetv', 'hulu', 'sling', 'cable', 'max'])).toEqual([
      'Max',
      'YouTube TV',
      'Hulu + Live TV',
      'Sling TV',
      'Cable / Satellite',
    ])
  })

  it('bundle carriage differs — Sling carries the Turner nets but not CBS', () => {
    expect(labels(['CBS'], ['sling'])).toEqual([])
    expect(labels(['TBS'], ['sling'])).toEqual(['Sling TV'])
  })

  it('ignores a network the tournament does not use', () => {
    expect(labels(['ESPN'], ['cable', 'youtubetv'])).toEqual([])
  })

  it('returns [] with no selection or no broadcast', () => {
    expect(watchableServices(['CBS'], [])).toEqual([])
    expect(watchableServices(['CBS'], undefined)).toEqual([])
    expect(watchableServices(undefined, ['youtubetv'])).toEqual([])
    expect(watchableServices([], ['youtubetv'])).toEqual([])
  })

  it('exposes a catalog keyed for lookup', () => {
    expect(SERVICE_CATALOG.length).toBeGreaterThanOrEqual(5)
    expect(SERVICE_BY_KEY.youtubetv.label).toBe('YouTube TV')
    expect(SERVICE_BY_KEY.paramount.kind).toBe('stream')
    expect(SERVICE_BY_KEY.youtubetv.kind).toBe('bundle')
  })
})

describe('broadcastNotBadged', () => {
  const svc = (label) => ({ label })

  it('drops a network already shown as a badge but keeps the rest', () => {
    expect(broadcastNotBadged(['NBC', 'Peacock'], [svc('Peacock')])).toEqual(['NBC'])
    expect(broadcastNotBadged(['Prime Video'], [svc('Prime Video')])).toEqual([])
  })

  it('leaves a bundle badge’s underlying network in place (YouTube TV ≠ ESPN)', () => {
    expect(broadcastNotBadged(['ESPN'], [svc('YouTube TV')])).toEqual(['ESPN'])
  })

  it('returns the whole list when nothing is badged', () => {
    expect(broadcastNotBadged(['ESPN', 'ABC'], [])).toEqual(['ESPN', 'ABC'])
    expect(broadcastNotBadged(undefined, [])).toEqual([])
  })
})
