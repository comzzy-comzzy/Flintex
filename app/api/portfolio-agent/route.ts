import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: 'https://cc.freemodel.dev',
})

const DEFAULT_RESPONSE = {
  regime: 'RISK-OFF',
  usycAllocation: 30,
  reasoning: [
    'Unable to parse AI agent response',
    'Defaulting to conservative RISK-OFF stance',
    'Keeping a defensive USYC allocation until the next successful run',
  ],
}

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

export async function POST(req: NextRequest) {
  try {
    const { portfolio } = await req.json()

    const prompt = [
      'Analyze this crypto portfolio and respond with JSON only.',
      'Return exactly these fields: regime, usycAllocation, and reasoning.',
      'regime must be either "RISK-ON" or "RISK-OFF".',
      'usycAllocation must be a number from 0 to 100.',
      'reasoning must be an array of short strings.',
      `Portfolio: ${JSON.stringify(portfolio)}`,
    ].join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
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

      return NextResponse.json(JSON.parse(text.slice(start, end + 1)))
    } catch (error) {
      console.error('Portfolio agent JSON extraction failed:', error)
      return NextResponse.json(DEFAULT_RESPONSE)
    }
  } catch (error) {
    console.error('Portfolio agent request failed:', error)
    return NextResponse.json(DEFAULT_RESPONSE)
  }
}
