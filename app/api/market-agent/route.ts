import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: 'https://cc.freemodel.dev',
})

const SYSTEM_PROMPT = [
  'You are MarketAgent for Flintex.',
  'Scan current macroeconomic and geopolitical news for events that can become clear binary USDC prediction markets on Arc testnet.',
  'Return JSON only. Do not include markdown or prose outside JSON.',
  'Return exactly this shape: {"news":[{"headline":"string","source":"string","publishedAt":"ISO or readable time","relevanceScore":0-100,"summary":"string"}],"markets":[{"title":"string","description":"string","resolutionCriteria":"string","deadline":"YYYY-MM-DD","initialLiquidity":"$0 USDC","aiProbability":0-100,"category":"Macro|Rates|Inflation|Energy|Geopolitics|FX|Election|Credit","triggeredByNews":"string"}]}.',
  'Create 3 to 5 markets. Each market must be specific, resolvable, time-bound, and suitable for USDC settlement.',
  'Use the supplied headlines only. Do not invent breaking news.',
  'Set aiProbability as the AI estimate that YES resolves true, not the relevance score.',
  'Set triggeredByNews to the exact headline that caused the market to spawn.',
].join('\n')

type MarketDraft = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: number
  category: string
  triggeredByNews: string
}

type NewsItem = {
  headline: string
  source: string
  publishedAt: string
  relevanceScore: number
  summary: string
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    headline: 'Fed speakers keep focus on sticky services inflation',
    source: 'Macro Desk',
    publishedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    relevanceScore: 92,
    summary: 'Policy comments keep rate-path uncertainty elevated for the next FOMC decision.',
  },
  {
    headline: 'Oil shipping risk rises after renewed Red Sea disruption reports',
    source: 'Geopolitics Wire',
    publishedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    relevanceScore: 88,
    summary: 'Energy transport risk may affect Brent volatility and inflation expectations.',
  },
  {
    headline: 'Treasury yields slip after weaker manufacturing data',
    source: 'Rates Feed',
    publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    relevanceScore: 81,
    summary: 'Softer activity data shifts attention back to growth-sensitive rate markets.',
  },
  {
    headline: 'Euro volatility climbs before ECB policy remarks',
    source: 'FX Monitor',
    publishedAt: new Date(Date.now() - 37 * 60 * 1000).toISOString(),
    relevanceScore: 76,
    summary: 'Currency options imply a wider range of outcomes around policy communication.',
  },
  {
    headline: 'Election polling spread narrows in key swing states',
    source: 'Political Risk',
    publishedAt: new Date(Date.now() - 49 * 60 * 1000).toISOString(),
    relevanceScore: 71,
    summary: 'Polling compression can create event markets around policy and election outcomes.',
  },
]

const DEFAULT_MARKETS: MarketDraft[] = [
  {
    title: 'Fed holds rates at the next FOMC meeting',
    description: 'Market on whether the next Federal Reserve decision leaves the target range unchanged.',
    resolutionCriteria: 'YES if the official FOMC statement announces no change to the target range.',
    deadline: '2026-06-11',
    initialLiquidity: '$5,000 USDC',
    aiProbability: 64,
    category: 'Rates',
    triggeredByNews: DEFAULT_NEWS[0].headline,
  },
  {
    title: 'Front-month Brent settles above $90 before deadline',
    description: 'Market tracking whether renewed shipping risk pushes Brent above the stated threshold.',
    resolutionCriteria: 'YES if front-month Brent crude settles above $90 on any official close before the deadline.',
    deadline: '2026-06-14',
    initialLiquidity: '$3,750 USDC',
    aiProbability: 57,
    category: 'Energy',
    triggeredByNews: DEFAULT_NEWS[1].headline,
  },
  {
    title: 'US 10Y yield closes below 4.25% this week',
    description: 'Market on whether weak activity data pulls long-end yields lower before the weekly close.',
    resolutionCriteria: 'YES if the US 10-year Treasury yield closes below 4.25% on the reference data source before deadline.',
    deadline: '2026-06-07',
    initialLiquidity: '$4,200 USDC',
    aiProbability: 61,
    category: 'Rates',
    triggeredByNews: DEFAULT_NEWS[2].headline,
  },
]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

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

const decodeXmlEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

const stripXml = (value: string) => {
  let decoded = value

  for (let index = 0; index < 2; index += 1) {
    decoded = decodeXmlEntities(decoded)
  }

  return decoded
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ')
    .replace(/<font\b[^>]*>[\s\S]*?<\/font>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const extractTag = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return ''

  return stripXml(match[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, ''))
}

const splitGoogleNewsTitle = (title: string) => {
  const separator = title.lastIndexOf(' - ')

  if (separator === -1) {
    return { title, source: 'Google News' }
  }

  return {
    title: title.slice(0, separator).trim(),
    source: title.slice(separator + 3).trim() || 'Google News',
  }
}

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const cleanString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const normalizeNews = (value: unknown, index: number): NewsItem | null => {
  if (!isRecord(value)) return null

  const headline = cleanString(value.headline ?? value.title, '')
  if (!headline) return null

  return {
    headline,
    source: cleanString(value.source, 'Macro News'),
    publishedAt: cleanString(value.publishedAt, new Date().toISOString()),
    relevanceScore: clamp(parseNumber(value.relevanceScore, 70 - index * 3), 0, 100),
    summary: cleanString(value.summary ?? value.description, 'MarketAgent is monitoring this headline for a resolvable event.'),
  }
}

const normalizeMarket = (value: unknown): MarketDraft | null => {
  if (!isRecord(value)) return null

  const title = cleanString(value.title, '')
  const description = cleanString(value.description, '')
  const resolutionCriteria = cleanString(value.resolutionCriteria, '')
  const deadline = cleanString(value.deadline, '')
  const initialLiquidity = cleanString(value.initialLiquidity, '$2,500 USDC')
  const category = cleanString(value.category, 'Macro')
  const triggeredByNews = cleanString(value.triggeredByNews, '')

  if (!title || !description || !resolutionCriteria || !deadline || !triggeredByNews) return null

  return {
    title,
    description,
    resolutionCriteria,
    deadline,
    initialLiquidity,
    aiProbability: clamp(parseNumber(value.aiProbability, 55), 1, 99),
    category,
    triggeredByNews,
  }
}

const parseAgentResponse = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in MarketAgent response')
  }

  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!isRecord(parsed)) {
    throw new Error('MarketAgent response was not an object')
  }

  const news = Array.isArray(parsed.news)
    ? parsed.news.map(normalizeNews).filter((item): item is NewsItem => item !== null)
    : []
  const markets = Array.isArray(parsed.markets)
    ? parsed.markets.map(normalizeMarket).filter((market): market is MarketDraft => market !== null)
    : []

  if (news.length === 0 || markets.length === 0) {
    throw new Error('MarketAgent response did not include complete news and market arrays')
  }

  return { news: news.slice(0, 5), markets: markets.slice(0, 5) }
}

const scoreHeadline = (headline: string, index: number) => {
  const text = headline.toLowerCase()
  const keywords = [
    'fed',
    'central bank',
    'inflation',
    'cpi',
    'rate',
    'yield',
    'oil',
    'energy',
    'election',
    'war',
    'geopolitical',
    'tariff',
    'currency',
    'dollar',
    'euro',
  ]
  const hits = keywords.filter((keyword) => text.includes(keyword)).length

  return clamp(64 + hits * 8 - index * 3, 45, 98)
}

const fetchMacroNews = async (): Promise<NewsItem[]> => {
  const response = await fetch(
    'https://news.google.com/rss/search?q=macro%20economy%20OR%20central%20bank%20OR%20inflation%20OR%20geopolitical%20risk%20OR%20oil%20OR%20election&hl=en-US&gl=US&ceid=US:en',
    { next: { revalidate: 900 } },
  )

  if (!response.ok) {
    throw new Error(`News feed request failed with ${response.status}`)
  }

  const xml = await response.text()
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []

  return items.slice(0, 8).map((item, index) => {
    const headline = splitGoogleNewsTitle(extractTag(item, 'title'))
    const description = extractTag(item, 'description')

    return {
      headline: headline.title,
      source: headline.source,
      publishedAt: extractTag(item, 'pubDate'),
      relevanceScore: scoreHeadline(headline.title, index),
      summary: description || 'MarketAgent is watching this headline for market creation.',
    }
  }).filter((item) => item.headline).slice(0, 5)
}

export async function POST() {
  let news: NewsItem[] = []

  try {
    news = await fetchMacroNews()
    const newsForPrompt = news.length > 0 ? news : DEFAULT_NEWS
    const prompt = [
      'Use these current headlines to spawn prediction markets.',
      'Return five monitored headlines with relevance scores and three to five market drafts.',
      `Current time: ${new Date().toISOString()}`,
      `News feed: ${JSON.stringify(newsForPrompt)}`,
    ].join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(response)
    console.log('Raw MarketAgent response:', text)
    if (!text) {
      console.log('Raw MarketAgent response object:', stringifyForLog(response))
    }

    try {
      const parsed = parseAgentResponse(text)
      return NextResponse.json(parsed)
    } catch (error) {
      console.error('MarketAgent JSON extraction failed:', error)
      return NextResponse.json({
        news: newsForPrompt.slice(0, 5),
        markets: DEFAULT_MARKETS,
        fallback: true,
      })
    }
  } catch (error) {
    console.error('MarketAgent request failed:', error)
    return NextResponse.json({
      news: news.length > 0 ? news.slice(0, 5) : DEFAULT_NEWS,
      markets: DEFAULT_MARKETS,
      fallback: true,
    })
  }
}
