import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: 'https://cc.freemodel.dev',
})

const MODEL = 'claude-haiku-4-5-20251001'
const HIGH_ALPHA_THRESHOLD = 15

const SYSTEM_PROMPT = [
  'You are BetAgent for Flintex.',
  'Estimate the true probability that each supplied binary prediction market resolves YES.',
  'Use the title, description, resolution criteria, deadline, category, and market price as context, but produce your own calibrated probability estimate.',
  'Return JSON only. Do not include markdown or prose outside JSON.',
  'Return exactly this shape: {"estimates":[{"marketId":"string","aiProbability":0-100,"reasoning":"string"}]}.',
  'Return one estimate for every supplied marketId. aiProbability must be the probability that YES resolves true, not the crowd probability.',
].join('\n')

type OpenMarket = {
  marketId: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  category: string
  crowdOdds: number
  fallbackProbability: number | null
}

type ModelEstimate = {
  marketId: string
  aiProbability: number
}

type BetOpportunity = {
  marketId: string
  title: string
  aiProbability: number
  crowdOdds: number
  disagreementScore: number
  kellySize: number
  expectedValue: number
  isHighAlpha: boolean
  recommendation: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseProbability = (value: unknown, fallback: number) => {
  const parsed = parseNumber(value, fallback)
  const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed

  return round(clamp(percent, 1, 99), 2)
}

const cleanString = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const extractMarkets = (body: unknown) => {
  if (Array.isArray(body)) return body
  if (!isRecord(body)) return []

  if (Array.isArray(body.openMarkets)) return body.openMarkets
  if (Array.isArray(body.markets)) return body.markets

  return []
}

const normalizeMarket = (value: unknown, index: number): OpenMarket | null => {
  if (!isRecord(value)) return null

  const title = cleanString(value.title, '')
  if (!title) return null

  return {
    marketId: cleanString(value.marketId ?? value.id, `market-${index + 1}`),
    title,
    description: cleanString(value.description, ''),
    resolutionCriteria: cleanString(value.resolutionCriteria, ''),
    deadline: cleanString(value.deadline, ''),
    category: cleanString(value.category, 'Prediction'),
    crowdOdds: parseProbability(value.crowdOdds ?? value.marketOdds ?? value.impliedOdds ?? value.impliedProbability, 50),
    fallbackProbability: isRecord(value) && (value.aiProbability !== undefined || value.modelOdds !== undefined)
      ? parseProbability(value.aiProbability ?? value.modelOdds, 50)
      : null,
  }
}

const fallbackProbabilityFor = (market: OpenMarket) => {
  if (market.fallbackProbability !== null) return market.fallbackProbability

  const text = `${market.title} ${market.description} ${market.resolutionCriteria}`.toLowerCase()
  const positiveSignals = ['holds', 'unchanged', 'above', 'exceed', 'higher', 'wins', 'passes', 'approved', 'settles above']
  const negativeSignals = ['below', 'cut', 'lower', 'fails', 'declines', 'misses', 'rejected']
  const positiveScore = positiveSignals.filter((signal) => text.includes(signal)).length
  const negativeScore = negativeSignals.filter((signal) => text.includes(signal)).length
  const adjustment = (positiveScore - negativeScore) * 3

  return round(clamp(market.crowdOdds + adjustment, 5, 95), 2)
}

const stringifyForLog = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const extractText = (value: unknown, depth = 0): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (depth < 3 && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const nestedText = extractText(JSON.parse(trimmed), depth + 1)
        if (nestedText) return nestedText
      } catch {
        return value
      }
    }

    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item, depth)).filter(Boolean).join('\n')
  }

  if (!isRecord(value)) return ''

  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content

  if (Array.isArray(value.content)) {
    return extractText(value.content, depth)
  }

  if (Array.isArray(value.choices)) {
    return extractText(value.choices, depth)
  }

  if (isRecord(value.message)) {
    return extractText(value.message, depth)
  }

  return ''
}

const parseAgentEstimates = (text: string, markets: OpenMarket[]) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in BetAgent response')
  }

  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!isRecord(parsed) || !Array.isArray(parsed.estimates)) {
    throw new Error('BetAgent response did not include estimates array')
  }

  const marketIds = new Set(markets.map((market) => market.marketId))
  const estimates = new Map<string, ModelEstimate>()

  for (const estimate of parsed.estimates) {
    if (!isRecord(estimate)) continue

    const marketId = cleanString(estimate.marketId, '')
    if (!marketIds.has(marketId)) continue

    estimates.set(marketId, {
      marketId,
      aiProbability: parseProbability(estimate.aiProbability, fallbackProbabilityFor(markets.find((market) => market.marketId === marketId) as OpenMarket)),
    })
  }

  return estimates
}

const getRecommendation = (aiProbability: number, crowdOdds: number, kellySize: number, isHighAlpha: boolean) => {
  if (kellySize <= 0) return 'PASS'

  const side = aiProbability >= crowdOdds ? 'BET_YES' : 'BET_NO'
  return isHighAlpha ? `HIGH_ALPHA_${side}` : side
}

const calculateOpportunity = (market: OpenMarket, aiProbability: number): BetOpportunity => {
  const aiYes = clamp(aiProbability / 100, 0.01, 0.99)
  const crowdYes = clamp(market.crowdOdds / 100, 0.01, 0.99)
  const disagreementScore = Math.abs(aiProbability - market.crowdOdds)
  const isHighAlpha = disagreementScore > HIGH_ALPHA_THRESHOLD
  const targetIsYes = aiYes >= crowdYes
  const trueProbability = targetIsYes ? aiYes : 1 - aiYes
  const impliedProbability = targetIsYes ? crowdYes : 1 - crowdYes
  const odds = 1 / impliedProbability
  const b = odds - 1
  const p = trueProbability
  const q = 1 - p
  const rawKelly = b > 0 ? (b * p - q) / b : 0
  const kellySize = clamp(rawKelly, 0, 1)
  const expectedValue = p * odds - 1

  return {
    marketId: market.marketId,
    title: market.title,
    aiProbability: round(aiProbability, 2),
    crowdOdds: round(market.crowdOdds, 2),
    disagreementScore: round(disagreementScore, 2),
    kellySize: round(kellySize, 4),
    expectedValue: round(expectedValue, 4),
    isHighAlpha,
    recommendation: getRecommendation(aiProbability, market.crowdOdds, kellySize, isHighAlpha),
  }
}

const buildFallbackOpportunities = (markets: OpenMarket[]) =>
  markets.map((market) => calculateOpportunity(market, fallbackProbabilityFor(market)))

export async function POST(req: NextRequest) {
  let markets: OpenMarket[] = []

  try {
    const body = await req.json()
    markets = extractMarkets(body).map(normalizeMarket).filter((market): market is OpenMarket => market !== null)

    if (markets.length === 0) {
      return NextResponse.json({ opportunities: [], error: 'Expected request body to include an openMarkets or markets array.' }, { status: 400 })
    }

    const prompt = [
      'Estimate calibrated YES probabilities for these open prediction markets.',
      `Current time: ${new Date().toISOString()}`,
      `Open markets: ${JSON.stringify(markets)}`,
    ].join('\n')

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(response)
    console.log('Raw BetAgent response:', text)
    if (!text) {
      console.log('Raw BetAgent response object:', stringifyForLog(response))
    }

    try {
      const estimates = parseAgentEstimates(text, markets)
      const opportunities = markets.map((market) => {
        const estimate = estimates.get(market.marketId)
        return calculateOpportunity(market, estimate?.aiProbability ?? fallbackProbabilityFor(market))
      })

      return NextResponse.json({ opportunities })
    } catch (error) {
      console.error('BetAgent JSON extraction failed:', error)
      return NextResponse.json({ opportunities: buildFallbackOpportunities(markets), fallback: true })
    }
  } catch (error) {
    console.error('BetAgent request failed:', error)
    return NextResponse.json({ opportunities: buildFallbackOpportunities(markets), fallback: true })
  }
}
