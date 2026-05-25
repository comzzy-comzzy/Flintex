export type MarketOverrides = Record<string, MarketOverride>

export type MarketOverride = {
  marketId: string
  title?: string
  description?: string
  resolutionCriteria?: string
  deadline?: string | number
  aiProbability?: number
  category?: string
  triggeredByNews?: string
  note?: string
  updatedAt?: string
}

export type OverrideableMarket = {
  marketId: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: bigint
  aiProbability: number
  category: string
  triggeredByNews: string
}

export type MarketOverrideMetadata = {
  hasOffchainOverride?: boolean
  correctedDeadline?: bigint
  overrideNote?: string
  overrideUpdatedAt?: string
}

const cleanString = (value: unknown) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value !== 'string') return undefined

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || undefined
}

const parseDeadline = (value: unknown) => {
  if (typeof value === 'bigint') return value > 0n ? value : undefined
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return BigInt(Math.floor(value))
  if (typeof value !== 'string') return undefined

  const cleaned = value.trim()
  if (/^\d+$/.test(cleaned)) return BigInt(cleaned)

  const timestamp = cleaned.includes('T')
    ? Math.floor(new Date(cleaned).getTime() / 1000)
    : Math.floor(new Date(`${cleaned}T23:59:59Z`).getTime() / 1000)

  return Number.isFinite(timestamp) && timestamp > 0 ? BigInt(timestamp) : undefined
}

const parseProbability = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(100, Math.max(0, value))
}

const normalizeOverride = (marketId: string, value: unknown): MarketOverride | null => {
  if (typeof value !== 'object' || value === null) return null

  const row = value as Record<string, unknown>
  const normalizedMarketId = cleanString(row.marketId) ?? marketId
  if (!normalizedMarketId) return null

  return {
    marketId: normalizedMarketId,
    title: cleanString(row.title),
    description: cleanString(row.description),
    resolutionCriteria: cleanString(row.resolutionCriteria ?? row.criteria),
    deadline: cleanString(row.deadline) ?? (typeof row.deadline === 'number' ? row.deadline : undefined),
    aiProbability: parseProbability(row.aiProbability),
    category: cleanString(row.category),
    triggeredByNews: cleanString(row.triggeredByNews ?? row.news),
    note: cleanString(row.note ?? row.reason),
    updatedAt: cleanString(row.updatedAt),
  }
}

export const parseMarketOverrides = (rawJson?: string): MarketOverrides => {
  if (!rawJson) return {}

  try {
    const parsed = JSON.parse(rawJson) as unknown
    const entries = Array.isArray(parsed)
      ? parsed.map((value) => [cleanString((value as Record<string, unknown> | null)?.marketId) ?? '', value] as const)
      : typeof parsed === 'object' && parsed !== null
        ? Object.entries(parsed)
        : []

    return entries.reduce<MarketOverrides>((overrides, [marketId, value]) => {
      const override = normalizeOverride(marketId, value)
      if (override) overrides[override.marketId] = override
      return overrides
    }, {})
  } catch {
    return {}
  }
}

export const getConfiguredMarketOverrides = () => parseMarketOverrides(
  process.env.MARKET_OVERRIDES_JSON ?? process.env.NEXT_PUBLIC_MARKET_OVERRIDES_JSON,
)

export const applyMarketOverride = <T extends OverrideableMarket>(
  market: T,
  overrides: MarketOverrides = getConfiguredMarketOverrides(),
): T & MarketOverrideMetadata => {
  const override = overrides[market.marketId]
  if (!override) return { ...market, hasOffchainOverride: false }

  return {
    ...market,
    title: override.title ?? market.title,
    description: override.description ?? market.description,
    resolutionCriteria: override.resolutionCriteria ?? market.resolutionCriteria,
    aiProbability: override.aiProbability ?? market.aiProbability,
    category: override.category ?? market.category,
    triggeredByNews: override.triggeredByNews ?? market.triggeredByNews,
    hasOffchainOverride: true,
    correctedDeadline: parseDeadline(override.deadline),
    overrideNote: override.note,
    overrideUpdatedAt: override.updatedAt,
  }
}

export const getEffectiveResolutionDeadline = (market: OverrideableMarket & MarketOverrideMetadata) =>
  market.correctedDeadline ?? market.deadline

export const getResolverUnlockDeadline = (market: OverrideableMarket & MarketOverrideMetadata) => {
  const effectiveDeadline = getEffectiveResolutionDeadline(market)
  return effectiveDeadline > market.deadline ? effectiveDeadline : market.deadline
}
