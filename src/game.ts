import type { Catalog, Pair, PriceHistory, Ticker } from './types'

export const ROUND_CAPITAL = 10_000

export function pacificSeed(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
}

export function hashSeed(value: string): () => number {
  let state = 2166136261
  for (let i = 0; i < value.length; i += 1) { state ^= value.charCodeAt(i); state = Math.imul(state, 16777619) }
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export function challengeFor(seed: string, catalog: Catalog): { date: string; pairs: Pair[] } {
  const random = hashSeed(`${seed}:${catalog.version}`)
  const date = catalog.dates[Math.floor(random() * catalog.dates.length)]
  const available = catalog.tickers.filter((ticker) => ticker.history && (!ticker.start || ticker.start <= date) && (!ticker.end || ticker.end >= date))
  const picked = new Set<string>()
  const pairs: Pair[] = []
  for (let round = 0; round < 3; round += 1) {
    const choices = available.filter((ticker) => !picked.has(ticker.symbol))
    const left = choices[Math.floor(random() * choices.length)]
    let peers = choices.filter((ticker) => ticker.symbol !== left.symbol && ticker.industry === left.industry)
    if (!peers.length) peers = choices.filter((ticker) => ticker.symbol !== left.symbol && ticker.sector === left.sector)
    if (!peers.length) peers = choices.filter((ticker) => ticker.symbol !== left.symbol)
    const right = peers[Math.floor(random() * peers.length)]
    picked.add(left.symbol); picked.add(right.symbol); pairs.push({ left, right })
  }
  return { date, pairs }
}

export function outcome(start: number, latest: number, investment: number) {
  return investment * latest / start
}

export function roundOutcome(left: PriceHistory, right: PriceHistory, date: string, latest: Record<string, number>, leftAllocation: number) {
  const leftStart = left.prices[date]; const rightStart = right.prices[date]
  const leftValue = outcome(leftStart, latest[left.symbol], leftAllocation)
  const rightValue = outcome(rightStart, latest[right.symbol], ROUND_CAPITAL - leftAllocation)
  const leftAll = outcome(leftStart, latest[left.symbol], ROUND_CAPITAL)
  const rightAll = outcome(rightStart, latest[right.symbol], ROUND_CAPITAL)
  return { leftValue, rightValue, total: leftValue + rightValue, optimal: Math.max(leftAll, rightAll), leftReturn: latest[left.symbol] / leftStart - 1, rightReturn: latest[right.symbol] / rightStart - 1 }
}
