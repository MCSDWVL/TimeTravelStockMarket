import type { Catalog, LatestPrices, PriceHistory } from './types'

const root = import.meta.env.BASE_URL
async function load<T>(path: string): Promise<T> {
  const response = await fetch(`${root}${path.replace(/^\//, '')}`)
  if (!response.ok) throw new Error(`Could not load ${path}`)
  return response.json() as Promise<T>
}
export const getCatalog = () => load<Catalog>('data/catalog.json')
export const getLatest = () => load<LatestPrices>('data/latest.json')
export const getHistory = (path: string) => load<PriceHistory>(`data/${path}`)
