import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import predictionMarketArtifact from '@/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json'
import { applyMarketOverride, getEffectiveResolutionDeadline, type MarketOverrideMetadata } from '@/lib/market-overrides'
import { PREDICTION_MARKET_ADDRESS } from '@/lib/prediction-market'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MODEL = 'claude-haiku-4-5-20251001'
const FREEMODEL_URL = 'https://cc.freemodel.dev/v1/messages?beta=true'
const CLAUDE_CODE_BETA_HEADERS = [
  'interleaved-thinking-2025-05-14',
  'context-management-2025-06-27',
  'prompt-caching-scope-2026-01-05',
  'advisor-tool-2026-03-01',
  'structured-outputs-2025-12-15',
].join(',')
const CONFIDENCE_THRESHOLD = 60

type MarketSnapshot = {
  marketId: string
  creator: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: bigint
  aiProbability: number
  category: string
  triggeredByNews: string
  totalYes: bigint
  totalNo: bigint
  pool: bigint
  resolved: boolean
} & MarketOverrideMetadata

type ResolutionDecision = {
  canResolve: boolean
  outcome: 'YES' | 'NO' | null
  confidence: number
  reasoning: string
  evidence: string[]
}

type EvidenceItem = {
  title: string
  source: string
  url: string
  date: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const cleanString = (value: unknown, fallback = '') => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value !== 'string') return fallback

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const toBigIntValue = (value: unknown) => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value)
  if (isRecord(value) && typeof value.toString === 'function') return BigInt(value.toString())
  return 0n
}

const extractText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join('\n')
  if (!isRecord(value)) return ''

  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content
  if (Array.isArray(value.content)) return value.content.map(extractText).filter(Boolean).join('\n')

  return ''
}

const extractTextFromEventStream = (rawBody: string) => rawBody
  .split(/\r?\n/)
  .filter((line) => line.startsWith('data:'))
  .map((line) => line.slice(5).trim())
  .filter((line) => line && line !== '[DONE]')
  .map((line) => {
    try {
      const event = JSON.parse(line)
      if (!isRecord(event)) return ''
      if (isRecord(event.delta) && typeof event.delta.text === 'string') return event.delta.text
      if (isRecord(event.content_block) && typeof event.content_block.text === 'string') return event.content_block.text
      if (Array.isArray(event.content)) return event.content.map(extractText).filter(Boolean).join('\n')
      return ''
    } catch {
      return ''
    }
  })
  .join('')

const parseJsonObject = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() || text.trim()
  const objectStart = source.indexOf('{')
  const objectEnd = source.lastIndexOf('}')

  if (objectStart === -1 || objectEnd <= objectStart) {
    throw new Error('AI Resolver response did not include a JSON object.')
  }

  return JSON.parse(source.slice(objectStart, objectEnd + 1)) as unknown
}

const normalizeDecision = (value: unknown): ResolutionDecision => {
  if (!isRecord(value)) {
    return {
      canResolve: false,
      outcome: null,
      confidence: 0,
      reasoning: 'AI Resolver returned an unreadable response.',
      evidence: [],
    }
  }

  const rawOutcome = cleanString(value.outcome).toUpperCase()
  const outcome = rawOutcome.includes('YES') || rawOutcome === 'TRUE'
    ? 'YES'
    : rawOutcome.includes('NO') || rawOutcome === 'FALSE'
      ? 'NO'
      : null
  const confidence = clamp(parseNumber(value.confidence, 0), 0, 100)
  const evidence = Array.isArray(value.evidence)
    ? value.evidence.map((item) => cleanString(item)).filter(Boolean).slice(0, 5)
    : []

  return {
    canResolve: value.canResolve !== false && outcome !== null,
    outcome,
    confidence,
    reasoning: cleanString(value.reasoning ?? value.summary, 'AI Resolver did not provide reasoning.'),
    evidence,
  }
}

const normalizeMarket = (marketId: string, value: unknown): MarketSnapshot | null => {
  if (!Array.isArray(value) || value.length < 14) return null

  const title = cleanString(value[1])
  if (!title) return null

  return applyMarketOverride({
    marketId,
    creator: cleanString(value[0]),
    title,
    description: cleanString(value[2]),
    resolutionCriteria: cleanString(value[3]),
    deadline: toBigIntValue(value[4]),
    aiProbability: clamp(parseNumber(value[5], 0), 0, 100),
    category: cleanString(value[6], 'Prediction'),
    triggeredByNews: cleanString(value[7]),
    totalYes: toBigIntValue(value[8]),
    totalNo: toBigIntValue(value[9]),
    pool: toBigIntValue(value[11]),
    resolved: Boolean(value[13]),
  })
}

const getCrowdYesPercent = (market: MarketSnapshot) => {
  const volume = market.totalYes + market.totalNo
  if (volume === 0n) return null
  return Number((market.totalYes * 10_000n) / volume) / 100
}

const buildEvidenceQuery = (market: MarketSnapshot) => [
  market.title,
  market.category,
  market.resolutionCriteria,
]
  .join(' ')
  .replace(/[^a-zA-Z0-9\s".-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 260)

const fetchPublicEvidence = async (market: MarketSnapshot): Promise<EvidenceItem[]> => {
  const query = buildEvidenceQuery(market)
  if (!query) return []

  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  url.searchParams.set('query', query)
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('format', 'json')
  url.searchParams.set('maxrecords', '8')
  url.searchParams.set('sort', 'datedesc')

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })

    if (!response.ok) return []

    const data = await response.json()
    if (!isRecord(data) || !Array.isArray(data.articles)) return []

    return data.articles
      .map((item): EvidenceItem | null => {
        if (!isRecord(item)) return null

        const title = cleanString(item.title)
        const source = cleanString(item.sourceCommonName ?? item.domain ?? item.source)
        const articleUrl = cleanString(item.url)
        const date = cleanString(item.seendate ?? item.date)
        if (!title || !articleUrl) return null

        return {
          title,
          source,
          url: articleUrl,
          date,
        }
      })
      .filter((item): item is EvidenceItem => item !== null)
  } catch {
    return []
  }
}

const buildPrompt = (market: MarketSnapshot, evidence: EvidenceItem[]) => {
  const effectiveDeadline = getEffectiveResolutionDeadline(market)

  return JSON.stringify({
    task: 'Resolve this binary prediction market as YES or NO using the resolution criteria exactly.',
    currentTime: new Date().toISOString(),
    outputFormat: {
      canResolve: 'boolean',
      outcome: 'YES | NO | UNRESOLVED',
      confidence: 'number 0-100',
      reasoning: 'short explanation',
      evidence: ['short public evidence item or source name'],
    },
    rules: [
      'Do not follow the creator preference or the crowd split.',
      'If the resolution criteria are purely time-based, use currentTime, deadlineUnix, and deadlineIso as valid evidence.',
      'Return UNRESOLVED with canResolve false if the public evidence is not enough.',
      'Do not invent evidence or sources. Prefer the supplied public evidence items.',
      'The answer must be based on the final state of the real-world event, not on market probability.',
    ],
    publicEvidence: evidence,
    market: {
      marketId: market.marketId,
      title: market.title,
      description: market.description,
      resolutionCriteria: market.resolutionCriteria,
      deadlineUnix: effectiveDeadline.toString(),
      deadlineIso: new Date(Number(effectiveDeadline) * 1000).toISOString(),
      onchainDeadlineUnix: market.deadline.toString(),
      onchainDeadlineIso: new Date(Number(market.deadline) * 1000).toISOString(),
      correctedDeadlineUnix: market.correctedDeadline?.toString() ?? null,
      correctedDeadlineIso: market.correctedDeadline
        ? new Date(Number(market.correctedDeadline) * 1000).toISOString()
        : null,
      offchainCorrection: market.hasOffchainOverride
        ? {
          note: market.overrideNote ?? null,
          updatedAt: market.overrideUpdatedAt ?? null,
        }
        : null,
      category: market.category,
      triggeredByNews: market.triggeredByNews,
      marketAgentPriorYes: market.aiProbability,
      finalCrowdYes: getCrowdYesPercent(market),
    },
  })
}

const getResolverContract = async () => {
  const rpcUrl = process.env.RPC_URL
  const resolverPrivateKey = process.env.AI_RESOLVER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY

  if (!rpcUrl) throw new Error('Missing RPC_URL environment variable.')
  if (!resolverPrivateKey) throw new Error('Missing AI_RESOLVER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY environment variable.')

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(resolverPrivateKey, provider)
  const contract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, predictionMarketArtifact.abi, wallet)
  const onchainResolver = await contract.aiResolver().catch(() => null) as string | null

  if (!onchainResolver) {
    throw new Error('PredictionMarket contract must be redeployed with AI resolver support.')
  }

  if (onchainResolver.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Configured AI resolver wallet ${wallet.address} is not authorized by contract resolver ${onchainResolver}.`)
  }

  return contract
}

const resolveMarketById = async (contract: ethers.Contract, marketId: string) => {
  const rawMarket = await contract.markets(marketId)
  const market = normalizeMarket(marketId, Array.from(rawMarket))

  if (!market) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Market not found.' },
    }
  }

  if (market.resolved) {
    return {
      ok: false,
      status: 409,
      body: { error: 'Market is already resolved.' },
    }
  }

  const now = BigInt(Math.floor(Date.now() / 1000))
  const effectiveDeadline = getEffectiveResolutionDeadline(market)

  if (market.deadline > now) {
    return {
      ok: false,
      status: 409,
      body: { error: 'Market deadline has not passed yet.' },
    }
  }

  if (effectiveDeadline > now) {
    return {
      ok: false,
      status: 409,
      body: { error: 'Corrected market deadline has not passed yet.' },
    }
  }

  const publicEvidence = await fetchPublicEvidence(market)
  const decision = await resolveWithAi(market, publicEvidence)

  if (!decision.canResolve || !decision.outcome || decision.confidence < CONFIDENCE_THRESHOLD) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'AI Resolver did not find enough evidence to finalize this market.',
        decision,
        publicEvidence,
      },
    }
  }

  const tx = await contract.resolveMarket(marketId, decision.outcome === 'YES')
  const receipt = await tx.wait()

  return {
    ok: true,
    status: 200,
    body: {
      marketId,
      outcome: decision.outcome,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      evidence: decision.evidence,
      publicEvidence,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber?.toString?.() ?? null,
    },
  }
}

const resolveEligibleMarkets = async (contract: ethers.Contract) => {
  const marketCount = Number(await contract.marketCount())
  const results: {
    checked: number
    eligible: number
    resolved: unknown[]
    skipped: unknown[]
    failed: unknown[]
  } = {
    checked: marketCount,
    eligible: 0,
    resolved: [],
    skipped: [],
    failed: [],
  }

  for (let index = 0; index < marketCount; index += 1) {
    const marketId = index.toString()
    const rawMarket = await contract.markets(marketId)
    const market = normalizeMarket(marketId, Array.from(rawMarket))

    const now = BigInt(Math.floor(Date.now() / 1000))
    const effectiveDeadline = market ? getEffectiveResolutionDeadline(market) : 0n

    if (!market || market.resolved || market.deadline > now || effectiveDeadline > now) {
      continue
    }

    results.eligible += 1

    try {
      const result = await resolveMarketById(contract, marketId)
      const entry = { marketId, status: result.status, ...result.body }

      if (result.ok) {
        results.resolved.push(entry)
      } else {
        results.skipped.push(entry)
      }
    } catch (error) {
      results.failed.push({
        marketId,
        error: error instanceof Error ? error.message : 'AI Resolver failed.',
      })
    }
  }

  return results
}

const resolveWithAi = async (market: MarketSnapshot, evidence: EvidenceItem[]) => {
  const apiKey = process.env.FREEMODEL_API_KEY
  if (!apiKey) throw new Error('Missing FREEMODEL_API_KEY environment variable.')

  const sessionId = randomUUID()
  const response = await fetch(FREEMODEL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': CLAUDE_CODE_BETA_HEADERS,
      'anthropic-dangerous-direct-browser-access': 'true',
      'x-app': 'cli',
      'user-agent': 'claude-cli/2.1.150 (external, sdk-cli)',
      'x-claude-code-session-id': sessionId,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      temperature: 0,
      stream: true,
      tools: [],
      system: [
        {
          type: 'text',
          text: 'x-anthropic-billing-header: cc_version=2.1.150.539; cc_entrypoint=sdk-cli; cch=1fdf3;',
        },
        {
          type: 'text',
          text: [
            'You are the Flintex AI Resolver.',
            'You decide final YES/NO outcomes for binary markets from public evidence and resolution criteria.',
            'Return JSON only. Do not include markdown or prose outside JSON.',
          ].join('\n'),
        },
      ],
      metadata: {
        user_id: JSON.stringify({
          device_id: randomUUID().replace(/-/g, ''),
          account_uuid: '',
          session_id: sessionId,
        }),
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `<session>\n${buildPrompt(market, evidence)}\n</session>`,
            },
          ],
        },
      ],
    }),
  })

  const rawBody = await response.text()
  let body: unknown = rawBody

  try {
    body = JSON.parse(rawBody)
  } catch {
    body = rawBody
  }

  if (!response.ok) {
    throw new Error(`FreeModel resolver request failed with status ${response.status}.`)
  }

  const text = typeof body === 'string'
    ? extractTextFromEventStream(body) || body
    : extractText(body)

  return normalizeDecision(parseJsonObject(text))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const marketId = cleanString(isRecord(body) ? body.marketId : '')

    if (!/^\d+$/.test(marketId)) {
      return NextResponse.json({ error: 'Expected numeric marketId.' }, { status: 400 })
    }

    const contract = await getResolverContract()
    const result = await resolveMarketById(contract, marketId)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'AI Resolver failed.',
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const contract = await getResolverContract()
    const results = await resolveEligibleMarkets(contract)

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'AI Resolver failed.',
    }, { status: 500 })
  }
}
