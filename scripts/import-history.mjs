/**
 * Bootstrap the static archive. This is deliberately a build-time process:
 * nothing in the deployed browser calls Yahoo Finance.
 *
 * Usage: node scripts/import-history.mjs
 * Set TTSM_LIMIT=12 for a small smoke import before the full S&P 500 run.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const output = join(process.cwd(), 'public', 'data')
const start = Math.floor(Date.UTC(1988, 0, 1) / 1000)
const end = Math.floor(Date.now() / 1000)
const limit = Number(process.env.TTSM_LIMIT || 500)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clean = (html) => html.replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').replace(/&amp;/g, '&').trim()
const yahooSymbol = (symbol) => symbol.replace('.', '-')

async function roster() {
  const html = await (await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', { headers: { 'User-Agent': 'TimeTravelStockMarket data importer/1.0' } })).text()
  const table = html.match(/<table[^>]*id="constituents"[\s\S]*?<\/table>/i)?.[0]
  if (!table) throw new Error('Could not locate the S&P 500 constituents table.')
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(1).map((row) => [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1]))).filter((cells) => cells.length >= 5).map((cells) => ({ symbol: yahooSymbol(cells[0]), name: cells[1], sector: cells[2], industry: cells[3] })).slice(0, limit)
}

async function chart(symbol) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`)
  url.search = new URLSearchParams({ period1: String(start), period2: String(end), interval: '1d', events: 'history', includeAdjustedClose: 'true' })
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TimeTravelStockMarket archive importer' } })
  if (!response.ok) throw new Error(`${symbol}: Yahoo responded ${response.status}`)
  const result = (await response.json()).chart?.result?.[0]
  if (!result?.timestamp || !result?.indicators?.adjclose?.[0]?.adjclose) throw new Error(`${symbol}: Yahoo returned no adjusted history`)
  const adjusted = result.indicators.adjclose[0].adjclose
  const prices = {}
  result.timestamp.forEach((seconds, index) => { const price = adjusted[index]; if (Number.isFinite(price)) prices[new Date(seconds * 1000).toISOString().slice(0, 10)] = Number(price.toFixed(6)) })
  return prices
}

async function fetchWithRetry(symbol) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { return await chart(symbol) } catch (error) { if (attempt === 3) throw error; await sleep(1500 * (attempt + 1)) }
  }
}

await mkdir(join(output, 'histories'), { recursive: true })
const members = await roster()
const accepted = []
for (const [index, member] of members.entries()) {
  try {
    const prices = await fetchWithRetry(member.symbol)
    const dates = Object.keys(prices)
    if (dates.length < 250) throw new Error('insufficient history')
    const path = `histories/${member.symbol}.json`
    await writeFile(join(output, path), JSON.stringify({ symbol: member.symbol, prices }))
    accepted.push({ ...member, history: path, start: dates[0], end: dates.at(-1) })
    console.log(`[${index + 1}/${members.length}] ${member.symbol}`)
  } catch (error) { console.warn(`Skipping ${member.symbol}: ${error.message}`) }
  await sleep(300)
}
const benchmarkPrices = await fetchWithRetry('^SP500TR')
await writeFile(join(output, 'histories', 'SP500TR.json'), JSON.stringify({ symbol: '^SP500TR', prices: benchmarkPrices }))
const candidateDates = Object.keys(benchmarkPrices).filter((date) => accepted.filter((ticker) => ticker.start <= date && ticker.end >= date).length >= 6)
const asOf = Object.keys(benchmarkPrices).at(-1)
await writeFile(join(output, 'catalog.json'), JSON.stringify({ version: `archive-${asOf}`, asOf, dates: candidateDates, tickers: accepted, benchmark: 'histories/SP500TR.json' }))
console.log(`Wrote ${accepted.length} ticker histories; run npm run data:refresh to create latest.json.`)
