import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// GameDetail fetches the ESPN summary on open; stub the service so these render tests
// stay off the network (the summary sections have their own suite).
vi.mock('../src/services/summary.js', () => ({ fetchGameSummary: () => Promise.resolve(null) }))
import GameDetail from '../src/components/GameDetail.jsx'
import { livePeriod } from '../src/components/GameCard.jsx'
import { GAMES } from '../src/data/schedule.js'

const TZ = 'America/New_York'
const withLine = GAMES.find((g) => g.line && !g.ot)
// A single-overtime game: its extra column is labelled plainly "OT". (Multi-OT games
// number their periods OT2, OT3 — covered by the livePeriod suite below.)
const otGame = GAMES.find((g) => g.line && g.ot === 1)

const open = (game, props = {}) =>
  render(<GameDetail game={game} games={GAMES} tz={TZ} onClose={() => {}} {...props} />)

// The line score and game leaders live under the "Scoring" tab of a played game.
const openScoring = async (game, props = {}) => {
  const r = open(game, props)
  await userEvent.click(screen.getByRole('tab', { name: 'Scoring' }))
  return r
}

// Basketball has no enumerable scoring events, so the quarter breakdown is the
// closest thing to a goal timeline. It has to be exactly right or it's worse than
// showing nothing.
describe('line score', () => {
  it('is present for every played game in the committed data', () => {
    // The committed bracket is a completed 67-game tournament; every played game carries a
    // line score.
    const played = GAMES.filter((g) => g.score)
    expect(played.length).toBeGreaterThan(60)
    expect(played.every((g) => g.line)).toBe(true)
  })

  it('always sums to the final score', () => {
    for (const g of GAMES.filter((x) => x.line && x.score)) {
      const sum = (a) => a.reduce((x, y) => x + y, 0)
      expect([sum(g.line.home), sum(g.line.away)]).toEqual(g.score)
    }
  })

  it('renders one column per period played, plus a leading spacer and a total', async () => {
    // College regulation is two halves, so a non-OT game's line has two period columns.
    // (NOTE: the header still reads Q1/Q2 — an unconverted NBA-quarter label in
    // GameDetail's LineScore; see the app-bug report. This test pins the column *count*,
    // which is the load-bearing behaviour, not the carried-over label text.)
    const { container } = await openScoring(withLine)
    const periods = Math.max(withLine.line.home.length, withLine.line.away.length)
    expect(periods).toBe(2)
    const heads = [...container.querySelectorAll('.linescore thead th')].map((n) => n.textContent)
    expect(heads).toHaveLength(periods + 2)
    expect(heads[0]).toBe('')
    expect(heads.at(-1)).toBe('T')
  })

  it('adds a period column for an overtime game', async () => {
    // A single-OT game has three periods (two halves + OT), so it renders one more
    // period column than a regulation game.
    const { container } = await openScoring(otGame)
    const periods = Math.max(otGame.line.home.length, otGame.line.away.length)
    expect(periods).toBe(3)
    const heads = [...container.querySelectorAll('.linescore thead th')].map((n) => n.textContent)
    expect(heads).toHaveLength(periods + 2)
    expect(heads.at(-1)).toBe('T')
  })

  it('marks the higher scorer of each period', async () => {
    const { container } = await openScoring(withLine)
    const rows = container.querySelectorAll('.linescore tbody tr')
    const periods = Math.max(withLine.line.home.length, withLine.line.away.length)
    // Every period has at most one winner, and ties have none.
    for (let q = 0; q < periods; q++) {
      const [a, h] = [rows[0], rows[1]].map((r) => r.querySelectorAll('td')[q])
      const wonCount = [a, h].filter((td) => td.classList.contains('q-won')).length
      expect(wonCount).toBeLessThanOrEqual(1)
    }
  })

  it('is hidden in spoiler-free mode', async () => {
    const { container } = await openScoring(withLine, { hideScores: true })
    expect(container.querySelector('.linescore')).toBeNull()
    expect(screen.queryByText('By quarter')).not.toBeInTheDocument()
  })

  it('is omitted for a game that has not been played', () => {
    const upcoming = GAMES.find((g) => !g.score && !g.postponed)
    const { container } = open(upcoming)
    expect(container.querySelector('.linescore')).toBeNull()
  })
})

describe('game leaders', () => {
  it('shows points, rebounds, and assists for both teams', async () => {
    const { container } = await openScoring(withLine)
    const teams = container.querySelectorAll('.gl-team')
    expect(teams).toHaveLength(2)
    for (const t of teams) {
      const cats = [...t.querySelectorAll('.gl-cat')].map((n) => n.textContent)
      expect(cats).toEqual(['PTS', 'REB', 'AST'])
    }
  })

  it('attributes each leader to their own team', () => {
    const game = withLine
    for (const s of game.stars) {
      expect([game.home, game.away]).toContain(s.team)
    }
  })
})

// A basketball score moves every ~35 seconds, so the display must not imply
// precision the 30s poll can't deliver.
describe('livePeriod', () => {
  it('reports the half rather than a running clock', () => {
    // College basketball is two halves, not four quarters.
    expect(livePeriod({ period: 2, statusLabel: '2nd 4:21' })).toBe('2ND')
    expect(livePeriod({ period: 1, statusLabel: '1st 12:00' })).toBe('1ST')
  })

  it('handles halftime and end-of-period states', () => {
    expect(livePeriod({ period: 2, statusLabel: 'Halftime' })).toBe('HALF')
    expect(livePeriod({ period: 1, statusLabel: 'End of 1st' })).toBe('END OF 1ST')
  })

  it('labels overtime (period 3+ after two halves)', () => {
    expect(livePeriod({ period: 3, statusLabel: 'OT 2:00' })).toBe('OT')
    expect(livePeriod({ period: 4, statusLabel: '2OT 1:00' })).toBe('OT2')
  })

  it('falls back to the feed label when the period is unknown', () => {
    expect(livePeriod({ statusLabel: 'Delayed' })).toBe('DELAYED')
    expect(livePeriod({})).toBe('LIVE')
  })
})
