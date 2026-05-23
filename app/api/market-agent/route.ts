import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'

const FREEMODEL_BASE_URL = 'https://cc.freemodel.dev'
const FREEMODEL_URL = `${FREEMODEL_BASE_URL}/v1/messages?beta=true`
const FREEMODEL_MODEL = 'claude-haiku-4-5-20251001'
const CLAUDE_CODE_BETA_HEADERS = [
  'interleaved-thinking-2025-05-14',
  'context-management-2025-06-27',
  'prompt-caching-scope-2026-01-05',
  'advisor-tool-2026-03-01',
  'structured-outputs-2025-12-15',
].join(',')

type MarketIdea = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: number
  category: string
  triggeredByNews: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

const cleanString = (value: unknown, fallback = '') => {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const cleanNewsString = (value: unknown, fallback: string) => {
  if (typeof value === 'boolean') return fallback
  return cleanString(value, fallback)
}

const stringifyForLog = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const errorDetails = (error: unknown) => {
  if (!isRecord(error)) {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  return {
    name: typeof error.name === 'string' ? error.name : undefined,
    message: typeof error.message === 'string' ? error.message : String(error),
    status: typeof error.status === 'number' ? error.status : undefined,
    code: typeof error.code === 'string' ? error.code : undefined,
  }
}

const extractText = (responseBody: unknown): string => {
  if (typeof responseBody === 'string') return responseBody
  if (Array.isArray(responseBody)) return responseBody.map(extractText).filter(Boolean).join('\n')
  if (!isRecord(responseBody)) return ''

  if (typeof responseBody.text === 'string') return responseBody.text
  if (typeof responseBody.content === 'string') return responseBody.content
  if (Array.isArray(responseBody.content)) return responseBody.content.map(extractText).filter(Boolean).join('\n')
  if (Array.isArray(responseBody.choices)) return responseBody.choices.map(extractText).filter(Boolean).join('\n')
  if (isRecord(responseBody.message)) return extractText(responseBody.message)

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

const parseJsonFromText = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() || text.trim()
  const arrayStart = source.indexOf('[')
  const arrayEnd = source.lastIndexOf(']')

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return JSON.parse(source.slice(arrayStart, arrayEnd + 1))
  }

  const objectStart = source.indexOf('{')
  const objectEnd = source.lastIndexOf('}')

  if (objectStart !== -1 && objectEnd > objectStart) {
    return JSON.parse(source.slice(objectStart, objectEnd + 1))
  }

  throw new Error('FreeModel response did not contain a JSON array.')
}

const normalizeMarket = (value: unknown): MarketIdea | null => {
  if (!isRecord(value)) return null

  const title = cleanString(value.title)
  const description = cleanString(value.description)
  const resolutionCriteria = cleanString(value.resolutionCriteria ?? value.resolution)
  const deadline = cleanString(value.deadline)
  const initialLiquidity = cleanString(value.initialLiquidity)
  const category = cleanString(value.category, 'Macro')
  const triggeredByNews = cleanNewsString(
    value.triggeredByNews ?? value.news,
    'Current macroeconomic conditions and scheduled public data releases.',
  )
  const probability = parseNumber(value.aiProbability ?? value.probability)

  if (!title || !description || !resolutionCriteria || !deadline || !initialLiquidity || !category || !triggeredByNews || probability === null) {
    return null
  }

  return {
    title,
    description,
    resolutionCriteria,
    deadline,
    initialLiquidity,
    aiProbability: clamp(probability, 0, 100),
    category,
    triggeredByNews,
  }
}

const parseMarkets = (text: string, today: string) => {
  const parsed = parseJsonFromText(text)
  const rows = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.markets)
      ? parsed.markets
      : []

  const markets = rows
    .map(normalizeMarket)
    .filter((market): market is MarketIdea => market !== null)
    .filter((market) => market.deadline > today)

  if (markets.length === 0) {
    throw new Error('FreeModel response did not include usable market ideas.')
  }

  return markets.slice(0, 3)
}

export async function POST() {
  const apiKey = process.env.FREEMODEL_API_KEY

  if (!apiKey) {
    console.error('[MarketAgent] FREEMODEL_API_KEY is not configured.')
    return NextResponse.json({ error: 'FREEMODEL_API_KEY is not configured.' }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const sessionId = randomUUID()
  const prompt = [
    'Return only valid JSON. Do not include markdown fences, prose, notes, or explanations.',
    `Today is ${today}. Return a JSON array of exactly 3 prediction market ideas about current macro events.`,
    'Each object must have: title, description, resolutionCriteria, deadline, initialLiquidity, aiProbability, category, triggeredByNews.',
    `deadline must be YYYY-MM-DD and must be after ${today}. initialLiquidity must be a realistic small testnet USDC amount string between "5 USDC" and "20 USDC".`,
    'aiProbability must be the probability from 0 to 100 that YES resolves true.',
    'Markets must be specific, time-bound, binary, and resolvable from public data.',
  ].join('\n')

  try {
    console.log('[MarketAgent] Calling FreeModel', stringifyForLog({
      url: FREEMODEL_URL,
      model: FREEMODEL_MODEL,
      apiKeyConfigured: true,
    }))

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
        model: FREEMODEL_MODEL,
        system: [
          {
            type: 'text',
            text: 'x-anthropic-billing-header: cc_version=2.1.150.539; cc_entrypoint=sdk-cli; cch=1fdf3;',
          },
          {
            type: 'text',
            text: "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
          },
        ],
        tools: [],
        metadata: {
          user_id: JSON.stringify({
            device_id: randomUUID().replace(/-/g, ''),
            account_uuid: '',
            session_id: sessionId,
          }),
        },
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `<session>\n${prompt}\n</session>`,
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

    console.log('[MarketAgent] FreeModel response', stringifyForLog({
      status: response.status,
      ok: response.ok,
      body,
    }))

    if (!response.ok) {
      return NextResponse.json({
        error: 'FreeModel request failed.',
        status: response.status,
        body,
      }, { status: 502 })
    }

    const text = typeof body === 'string'
      ? extractTextFromEventStream(body) || body
      : extractText(body)
    const markets = parseMarkets(text, today)

    return NextResponse.json(markets)
  } catch (error) {
    console.error('[MarketAgent] Request failed', stringifyForLog({
      error: errorDetails(error),
      url: FREEMODEL_URL,
      model: FREEMODEL_MODEL,
    }))

    return NextResponse.json({
      error: 'MarketAgent request failed.',
      details: errorDetails(error),
    }, { status: 502 })
  }
}
