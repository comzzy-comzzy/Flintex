import { NextResponse } from 'next/server'
import { getConfiguredMarketOverrides } from '@/lib/market-overrides'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    overrides: getConfiguredMarketOverrides(),
  })
}
