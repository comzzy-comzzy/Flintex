import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: 'https://cc.freemodel.dev',
})

type MarketDraft = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
}

type NewsItem = {
  title: string
  description: string
  publishedAt: string
  source: string
}

const DEFAULT_MARKETS: MarketDraft[] = [
  {
    title: 'FOMC keeps rates unchanged',
    description: 'Market on whether the next Federal Reserve decision leaves the target range unchanged.',
    resolutionCriteria: 'YES if the official FOMC statement announces no change to the target range.',
    deadline: '2026-06-11',
    initialLiquidity: '$5,000 USDC',
  },
  {
    title: 'Next US CPI print comes in below consensus',
    description: 'Market tracking whether the next US CPI release is cooler than economist consensus.',
    resolutionCriteria: 'YES if the headline CPI value is below the consensus estimate published before release.',
    deadline: '2026-06-13',
    initialLiquidity: '$3,500 USDC',
  },
]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

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

const normalizeMarket = (value: unknown): MarketDraft | null => {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const description = typeof value.description === 'string' ? value.description.trim() : ''
  const resolutionCriteria = typeof value.resolutionCriteria === 'string' ? value.resolutionCriteria.trim() : ''
  const deadline = typeof value.deadline === 'string' ? value.deadline.trim() : ''
  const initialLiquidity = typeof value.initialLiquidity === 'string' ? value.initialLiquidity.trim() : ''

  if (!title || !description || !resolutionCriteria || !deadline || !initialLiquidity) return null

  return {
    title,
    description,
    resolutionCriteria,
    deadline,
    initialLiquidity,
  }
}

const parseMarkets = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in AI response')
  }

  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!isRecord(parsed) || !Array.isArray(parsed.markets)) {
    throw new Error('MarketAgent response did not include markets array')
  }

  return parsed.markets.map(normalizeMarket).filter((market): market is MarketDraft => market !== null)
}

const fetchMacroNews = async (): Promise<NewsItem[]> => {
  const response = await fetch(
    'https://news.google.com/rss/search?q=macro%20economy%20OR%20central%20bank%20OR%20inflation%20OR%20geopolitical%20risk&hl=en-US&gl=US&ceid=US:en',
    { next: { revalidate: 900 } },
  )

  if (!response.ok) {
    throw new Error(`News feed request failed with ${response.status}`)
  }

  const xml = await response.text()
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []

  return items.slice(0, 10).map((item) => {
    const headline = splitGoogleNewsTitle(extractTag(item, 'title'))

    return {
      title: headline.title,
      source: headline.source,
      description: extractTag(item, 'description'),
      publishedAt: extractTag(item, 'pubDate'),
    }
  }).filter((item) => item.title)
}

export async function POST() {
  let newsItems: NewsItem[] = []

  try {
    newsItems = await fetchMacroNews()
    const prompt = [
      'You are MarketAgent for Flintex.',
      'Scan these real, current macroeconomic and geopolitical news headlines for events that could become clear binary prediction markets.',
      'Use events such as central bank decisions, inflation releases, elections, energy shocks, sovereign risk, major geopolitical deadlines, or currency moves.',
      'Return JSON only with this exact shape:',
      '{"markets":[{"title":"string","description":"string","resolutionCriteria":"string","deadline":"YYYY-MM-DD","initialLiquidity":"$0 USDC"}]}',
      'Create 3 to 5 markets. Each market must be specific, resolvable, and suitable for USDC settlement.',
      `News feed: ${JSON.stringify(newsItems)}`,
    ].join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractText(response)
    console.log('Raw MarketAgent response:', text)
    if (!text) {
      console.log('Raw MarketAgent response object:', stringifyForLog(response))
    }

    try {
      const markets = parseMarkets(text)
      if (markets.length === 0) throw new Error('MarketAgent returned no complete markets')

      return NextResponse.json({ markets, newsItems })
    } catch (error) {
      console.error('MarketAgent JSON extraction failed:', error)
      return NextResponse.json({ markets: DEFAULT_MARKETS, newsItems, fallback: true })
    }
  } catch (error) {
    console.error('MarketAgent request failed:', error)
    return NextResponse.json({ markets: DEFAULT_MARKETS, newsItems, fallback: true })
  }
}
