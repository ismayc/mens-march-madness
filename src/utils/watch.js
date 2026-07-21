// The streaming services and TV packages a viewer can tell us they have, so the
// schedule can flag which games they can actually watch — and filter to them.
//
// A game's `broadcast` is a flat list of ESPN network names. The NCAA tournament airs
// nationally across CBS and the Turner networks (TBS, TNT, truTV); a streaming exclusive
// (Paramount+ carries the CBS games, Max carries the Turner games) is matched by its own
// name. A live-TV *bundle* (YouTube TV, Hulu + Live TV, Fubo, Sling, cable) never appears
// in that list — it carries a game whenever the game airs on a national linear network the
// bundle carries, so each bundle is defined by the networks it carries. Bundle carriage
// differs by bundle and, in reality, by market and over time; the mappings here are the
// national defaults and are deliberately approximate.

// National linear networks the tournament uses, by the exact name ESPN emits in `broadcast`.
const CBS = 'CBS'
const TBS = 'TBS'
const TNT = 'TNT'
const TRUTV = 'truTV'

// carries(...names) → a matcher that's true when a game's broadcast list names any
// of them.
const carries = (...names) => {
  const set = new Set(names)
  return (broadcast) => broadcast.some((n) => set.has(n))
}

// Ordered streaming-first, then live-TV bundles. This is also the display order for
// badges and the picker. `kind` only labels the picker ('Streaming' vs 'Live TV').
// Paramount+ streams the CBS games; Max streams the Turner (TBS/TNT/truTV) games. Sling's
// tournament tier carries the Turner networks but not CBS; the rest carry all four.
export const SERVICE_CATALOG = [
  { key: 'paramount', label: 'Paramount+', kind: 'stream', match: carries('Paramount+', CBS) },
  { key: 'max', label: 'Max', kind: 'stream', match: carries('HBO Max', 'Max', TBS, TNT, TRUTV) },
  { key: 'youtubetv', label: 'YouTube TV', kind: 'bundle', match: carries(CBS, TBS, TNT, TRUTV) },
  { key: 'hulu', label: 'Hulu + Live TV', kind: 'bundle', match: carries(CBS, TBS, TNT, TRUTV) },
  { key: 'fubo', label: 'Fubo', kind: 'bundle', match: carries(CBS, TBS, TNT, TRUTV) },
  { key: 'sling', label: 'Sling TV', kind: 'bundle', match: carries(TBS, TNT, TRUTV) },
  { key: 'cable', label: 'Cable / Satellite', kind: 'bundle', match: carries(CBS, TBS, TNT, TRUTV) },
]

export const SERVICE_BY_KEY = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.key, s]))

// Broadcast entries not already shown as a personalized 📺 badge, so a game on
// "Peacock" (with Peacock selected) renders one "📺 Peacock" badge rather than the
// redundant "Peacock · 📺 Peacock". Bundle badges (e.g. YouTube TV) don't match a
// broadcast name, so their underlying network (ESPN, NBC, …) is left in place.
export function broadcastNotBadged(broadcast, watched) {
  if (!broadcast?.length) return []
  const shown = new Set((watched || []).map((s) => s.label))
  return broadcast.filter((b) => !shown.has(b))
}

// The viewer's selected services (by key) that carry this game, in catalog order.
// Returns [] when nothing is selected or the broadcast is unknown — so a viewer who
// hasn't chosen services sees no personalized badge (the raw network list in the
// card meta still shows where the game is on).
export function watchableServices(broadcast, selectedKeys) {
  if (!broadcast?.length || !selectedKeys?.length) return []
  const selected = new Set(selectedKeys)
  return SERVICE_CATALOG.filter((s) => selected.has(s.key) && s.match(broadcast))
}
