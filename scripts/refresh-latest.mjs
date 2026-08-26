/** Fetch only latest closes. Retired symbols retain their last known snapshot until reconciliation removes them. */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(process.cwd(), 'public', 'data')
const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'))
const previous = JSON.parse(await readFile(join(root, 'latest.json'), 'utf8'))
const symbols = [...catalog.tickers.map((ticker) => ticker.symbol), '^SP500TR']
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function requestBatch(batch) {
  const url = new URL('https://query1.finance.yahoo.com/v7/finance/spark')
  url.search = new URLSearchParams({ symbols: batch.join(','), range: '5d', interval: '1d' })
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TimeTravelStockMarket price refresher' } })
  if (!response.ok) {
    if (batch.length === 1) { console.warn(`No current Yahoo quote for ${batch[0]}; retaining its prior snapshot.`); return {} }
    const midpoint = Math.ceil(batch.length / 2)
    const [left, right] = await Promise.all([requestBatch(batch.slice(0, midpoint)), requestBatch(batch.slice(midpoint))])
    return { ...left, ...right }
  }
  const payload = await response.json()
  const prices = {}
  for (const item of payload.spark?.result || []) {
    const quote = item.response?.[0]
    const close = quote?.indicators?.quote?.[0]?.close?.filter(Number.isFinite).at(-1)
    const timestamp = quote?.timestamp?.at(-1)
    if (Number.isFinite(close) && timestamp) prices[item.symbol] = { close: Number(close.toFixed(6)), date: new Date(timestamp * 1000).toISOString().slice(0, 10) }
  }
  return prices
}

const batches = Array.from({ length: Math.ceil(symbols.length / 40) }, (_, index) => symbols.slice(index * 40, index * 40 + 40))
const latest = {}
for (const batch of batches) { Object.assign(latest, await requestBatch(batch)); await sleep(500) }
const prices = { ...previous.prices }
let asOf = previous.asOf
for (const [symbol, quote] of Object.entries(latest)) { prices[symbol] = quote.close; if (quote.date > asOf) asOf = quote.date }
const missing = symbols.filter((symbol) => !Number.isFinite(prices[symbol]))
if (missing.length) throw new Error(`No latest or fallback price exists for: ${missing.join(', ')}`)
await writeFile(join(root, 'latest.json'), JSON.stringify({ asOf, prices }))
console.log(`Updated ${Object.keys(latest).length}/${symbols.length} current prices as of ${asOf}.`)
