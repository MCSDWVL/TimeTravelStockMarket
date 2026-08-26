import { describe, expect, it } from 'vitest'
import { challengeFor, hashSeed, outcome, ROUND_CAPITAL } from './game'
import type { Catalog } from './types'

const tickers = Array.from({ length: 6 }, (_, index) => ({ symbol: `T${index}`, name: `Ticker ${index}`, industry: 'Test', sector: 'Test', history: `T${index}.json` }))
const catalog: Catalog = { version: '1', asOf: '2026-01-01', dates: ['2000-01-01'], tickers, benchmark: 'benchmark.json' }
describe('game utilities', () => {
  it('makes the same challenge for the same seed', () => expect(challengeFor('abc', catalog)).toEqual(challengeFor('abc', catalog)))
  it('returns a stable random sequence', () => { const a = hashSeed('seed'); const b = hashSeed('seed'); expect([a(), a(), a()]).toEqual([b(), b(), b()]) })
  it('calculates investment outcome', () => expect(outcome(10, 15, ROUND_CAPITAL)).toBe(15_000))
})
