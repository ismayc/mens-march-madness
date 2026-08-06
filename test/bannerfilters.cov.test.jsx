import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
vi.mock('../src/services/summary.js', () => ({ fetchGameSummary: () => Promise.resolve(null) }))

// A two-game season, so the assertion is about the WIRING (App -> scheduleGames ->
// NextGame) and not about whatever the nightly refresh has left in the committed
// schedule. Everything else the data module exports is kept.
vi.mock('../src/data/schedule.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    GAMES: [
      {
        id: 'unwatchable',
        tip: '2026-03-19T18:00:00.000Z',
        round: 'R64',
        region: 'South',
        home: 'DUKE',
        away: 'ALA',
        homeSeed: 1,
        awaySeed: 16,
        venue: 'Rocket Arena',
        city: 'Cleveland',
        state: 'OH',
        broadcast: ['CBS'],
      },
      {
        id: 'watchable',
        tip: '2026-03-19T23:00:00.000Z',
        round: 'R64',
        region: 'West',
        home: 'ARIZ',
        away: 'AKR',
        homeSeed: 2,
        awaySeed: 15,
        venue: 'Moda Center',
        city: 'Portland',
        state: 'OR',
        broadcast: ['TBS'],
      },
    ],
  }
})

import App from '../src/App.jsx'
import { FollowProvider } from '../src/context/follow.jsx'
import { ServicesProvider } from '../src/context/services.jsx'

// Before both tips, so each game is genuinely upcoming and the banner has a
// choice to make.
const NOW = new Date('2026-03-19T16:00:00.000Z')

const mount = async () => {
  const utils = render(
    <FollowProvider>
      <ServicesProvider>
        <App />
      </ServicesProvider>
    </FollowProvider>
  )
  await act(async () => {})
  return utils
}

const banner = () => document.querySelector('.nextgame')

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
  Element.prototype.scrollIntoView = vi.fn()
  localStorage.clear()
  // Straight to the schedule: the banner lives there, and a two-game fixture is not a
  // field the other views are built to render.
  window.history.replaceState(null, '', '/?view=schedule')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events: [] }) }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const chooseServices = (keys) => {
  localStorage.setItem('mmm:services', JSON.stringify(keys))
  localStorage.setItem('mmm:watchOnly', '1')
}

describe('the Next game banner and the services filter', () => {
  it('counts down to the true next game when no services filter is on', async () => {
    await mount()
    // Scoped to the banner: both sides are also named on the cards below, so an
    // unscoped query matches twice.
    expect(banner().textContent).toContain('Duke')
    expect(banner().textContent).not.toContain('Arizona')
  })

  it('skips a game the viewer cannot watch and counts down to the next one they can', async () => {
    // Sling carries TBS/TNT/truTV but not CBS, so the earlier game drops out.
    chooseServices(['sling'])
    await mount()

    // The banner advertises the LATER game, because it is the next one actually
    // watchable. A banner fed the unfiltered season would still be showing the first
    // one here -- which the schedule below no longer lists either, so "Jump to it"
    // would have nowhere to land.
    expect(banner()).not.toBeNull()
    expect(banner().textContent).toContain('Arizona')
    expect(banner().textContent).not.toContain('Duke')
  })

  it('leaves the banner alone when the watch filter is on but no service is chosen', async () => {
    // Deliberate carve-out: clearing every service must not empty the schedule, so the
    // filter is a no-op and the true next game is back.
    chooseServices([])
    await mount()
    expect(banner().textContent).toContain('Duke')
  })
})
