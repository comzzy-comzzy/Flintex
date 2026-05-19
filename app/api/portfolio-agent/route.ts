import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: 'https://cc.freemodel.dev',
})

const SYSTEM_PROMPT = [
  'You are PortfolioAgent for Flintex.',
  'You must be deterministic, conservative, and consistent for identical portfolio inputs.',
  'Return JSON only. Do not include markdown, comments, or prose outside JSON.',
  'Return exactly these fields: regime, usycAllocation, and reasoning.',
  'regime must be either "RISK-ON" or "RISK-OFF".',
  'usycAllocation must be a number from 0 to 100.',
  'reasoning must be an array of short strings based on the actual portfolio composition.',
  'Strict stablecoin rule: if the portfolio contains ONLY USDC, EURC, and/or USYC with no volatile assets, regime must always be "RISK-OFF" and usycAllocation must be between 60 and 80.',
  'Strict volatile rule: if BTC, ETH, or other volatile assets are above 20% of portfolio value, regime can be "RISK-ON" and usycAllocation must be between 10 and 30.',
  'Never invent assets, macro signals, or balances that are not in the supplied portfolio.',
  'Never return wildly different results for the same portfolio.',
].join('\n')

const DEFAULT_RESPONSE: PortfolioAgentResponse = {
  regime: 'RISK-OFF',
  usycAllocation: 70,
  reasoning: [
    'Unable to parse AI agent response',
    'Defaulting to conservative RISK-OFF stance',
    'Keeping a defensive USYC allocation until the next successful run',
  ],
}

const STABLECOINS = new Set(['USDC', 'EURC', 'USYC'])

type PortfolioAgentResponse = {
  regime: 'RISK-ON' | 'RISK-OFF'
  usycAllocation: number
  reasoning: string[]
}

type PortfolioProfile = {
  assets: string[]
  stableAssets: string[]
  volatileAssets: string[]
  stableOnly: boolean
  totalWeight: number
  volatileWeight: number
  volatileShare: number
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

const unique = (values: string[]) => Array.from(new Set(values))

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0
  if (typeof value !== 'string') return 0

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const getAssetSymbol = (position: unknown) => {
  if (!isRecord(position)) return ''

  return String(position.asset ?? position.symbol ?? position.token ?? '')
    .trim()
    .toUpperCase()
}

const analyzePortfolio = (portfolio: unknown): PortfolioProfile => {
  const positions = Array.isArray(portfolio) ? portfolio : []
  const assets: string[] = []
  const stableAssets: string[] = []
  const volatileAssets: string[] = []
  let totalWeight = 0
  let volatileWeight = 0

  for (const position of positions) {
    if (!isRecord(position)) continue

    const symbol = getAssetSymbol(position)
    if (!symbol) continue

    const value = parseNumber(position.value)
    const fallbackAmount = parseNumber(position.amount)
    const weight = value > 0 ? value : fallbackAmount
    const isStablecoin = STABLECOINS.has(symbol)

    assets.push(symbol)
    totalWeight += weight

    if (isStablecoin) {
      stableAssets.push(symbol)
    } else {
      volatileAssets.push(symbol)
      volatileWeight += weight
    }
  }

  const uniqueAssets = unique(assets)
  const uniqueVolatileAssets = unique(volatileAssets)
  const stableOnly = uniqueAssets.length > 0 && uniqueAssets.every((asset) => STABLECOINS.has(asset))
  const volatileShare = totalWeight > 0
    ? (volatileWeight / totalWeight) * 100
    : uniqueVolatileAssets.length > 0
      ? 100
      : 0

  return {
    assets: uniqueAssets,
    stableAssets: unique(stableAssets),
    volatileAssets: uniqueVolatileAssets,
    stableOnly,
    totalWeight,
    volatileWeight,
    volatileShare,
  }
}

const formatShare = (value: number) => `${Math.round(value)}%`

const buildStrictPolicyResponse = (profile: PortfolioProfile): PortfolioAgentResponse | null => {
  if (profile.stableOnly) {
    const stableList = profile.stableAssets.join(', ')

    return {
      regime: 'RISK-OFF',
      usycAllocation: 70,
      reasoning: [
        `Detected only stablecoin assets: ${stableList}.`,
        'No BTC, ETH, or other volatile assets were present, so the stablecoin-only rule applies.',
        'Regime is RISK-OFF and USYC allocation is set to 70% within the required 60-80 band.',
      ],
    }
  }

  if (profile.volatileShare > 20) {
    const volatileList = profile.volatileAssets.join(', ')

    return {
      regime: 'RISK-ON',
      usycAllocation: 20,
      reasoning: [
        `Detected volatile assets above the 20% threshold: ${volatileList}.`,
        `Volatile exposure is ${formatShare(profile.volatileShare)} of the portfolio composition.`,
        'Regime is RISK-ON and USYC allocation is set to 20% within the required 10-30 band.',
      ],
    }
  }

  return null
}

const normalizeAgentResponse = (value: unknown, profile: PortfolioProfile): PortfolioAgentResponse => {
  const strictResponse = buildStrictPolicyResponse(profile)
  if (strictResponse) return strictResponse

  if (!isRecord(value)) return DEFAULT_RESPONSE

  const regime = value.regime === 'RISK-ON' || value.regime === 'RISK-OFF' ? value.regime : DEFAULT_RESPONSE.regime
  const allocation = typeof value.usycAllocation === 'number' ? value.usycAllocation : DEFAULT_RESPONSE.usycAllocation
  const reasoning = Array.isArray(value.reasoning)
    ? value.reasoning.filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
    : DEFAULT_RESPONSE.reasoning

  return {
    regime,
    usycAllocation: clamp(allocation, 0, 100),
    reasoning: reasoning.length > 0 ? reasoning : DEFAULT_RESPONSE.reasoning,
  }
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

export async function POST(req: NextRequest) {
  try {
    const { portfolio } = await req.json()
    const profile = analyzePortfolio(portfolio)
    const strictPolicyResponse = buildStrictPolicyResponse(profile)

    if (strictPolicyResponse) {
      return NextResponse.json(strictPolicyResponse)
    }

    const prompt = [
      'Analyze this portfolio using the strict system rules.',
      `Portfolio profile: ${JSON.stringify(profile)}`,
      `Portfolio: ${JSON.stringify(portfolio)}`,
    ].join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(response)
    console.log('Raw AI response:', text)
    if (!text) {
      console.log('Raw AI response object:', stringifyForLog(response))
    }

    try {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')

      if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON object found in AI response')
      }

      return NextResponse.json(normalizeAgentResponse(JSON.parse(text.slice(start, end + 1)), profile))
    } catch (error) {
      console.error('Portfolio agent JSON extraction failed:', error)
      return NextResponse.json(DEFAULT_RESPONSE)
    }
  } catch (error) {
    console.error('Portfolio agent request failed:', error)
    return NextResponse.json(DEFAULT_RESPONSE)
  }
}
