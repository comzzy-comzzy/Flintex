import { useSyncExternalStore } from 'react'

export const OPEN_MARKETS_STORAGE_KEY = 'flintex_markets'
const LEGACY_OPEN_MARKETS_STORAGE_KEY = 'flintex.openMarkets'
const OPEN_MARKETS_EVENT = 'flintex-open-markets'
let cachedSerialized: string | null = null
let cachedMarkets: StoredMarket[] = []

export type StoredMarket = {
  id: string
  contractMarketId?: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: number
  crowdOdds: number
  category: string
  triggeredByNews: string
  spawnedAt: string
}

export const getOpenMarkets = (): StoredMarket[] => {
  if (typeof window === 'undefined') return []

  try {
    const storedMarkets = window.localStorage.getItem(OPEN_MARKETS_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_OPEN_MARKETS_STORAGE_KEY)
    if (storedMarkets === cachedSerialized) return cachedMarkets
    if (!storedMarkets) {
      cachedSerialized = ''
      cachedMarkets = []
      return cachedMarkets
    }

    const parsed = JSON.parse(storedMarkets)
    cachedSerialized = storedMarkets
    cachedMarkets = Array.isArray(parsed) ? parsed : []
    if (!window.localStorage.getItem(OPEN_MARKETS_STORAGE_KEY)) {
      window.localStorage.setItem(OPEN_MARKETS_STORAGE_KEY, storedMarkets)
    }
    return cachedMarkets
  } catch {
    window.localStorage.removeItem(OPEN_MARKETS_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_OPEN_MARKETS_STORAGE_KEY)
    cachedSerialized = ''
    cachedMarkets = []
    return []
  }
}

export const setOpenMarkets = (markets: StoredMarket[]) => {
  if (typeof window === 'undefined') return
  cachedMarkets = markets
  cachedSerialized = JSON.stringify(markets)
  window.localStorage.setItem(OPEN_MARKETS_STORAGE_KEY, cachedSerialized)
  window.localStorage.removeItem(LEGACY_OPEN_MARKETS_STORAGE_KEY)
  window.dispatchEvent(new Event(OPEN_MARKETS_EVENT))
}

export const subscribeOpenMarkets = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return
    if (event.key !== OPEN_MARKETS_STORAGE_KEY) return

    callback()
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener(OPEN_MARKETS_EVENT, callback)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(OPEN_MARKETS_EVENT, callback)
  }
}

export const useOpenMarkets = () =>
  useSyncExternalStore(subscribeOpenMarkets, getOpenMarkets, () => [])
