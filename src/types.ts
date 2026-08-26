export type Ticker = { symbol: string; name: string; industry: string; sector: string; history: string; start?: string; end?: string }
export type Catalog = { version: string; asOf: string; dates: string[]; tickers: Ticker[]; benchmark: string }
export type PriceHistory = { symbol: string; prices: Record<string, number> }
export type LatestPrices = { asOf: string; prices: Record<string, number> }
export type Pair = { left: Ticker; right: Ticker }
export type Round = { pair: Pair; allocation: number; startDate: string }
