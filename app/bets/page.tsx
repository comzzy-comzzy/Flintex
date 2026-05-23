'use client'

import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import { formatUnits } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import {
  ARC_TESTNET_CHAIN_ID,
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
  USDC_DECIMALS,
} from '@/lib/prediction-market'

type BetSide = 'YES' | 'NO' | 'PASS'

type ContractMarket = {
  id: bigint
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
  liquidity: bigint
  pool: bigint
  outcome: number
  resolved: boolean
}

type BetOpportunity = {
  marketId: string
  title: string
  side: BetSide
  aiProbability: number
  crowdOdds: number
  disagreementScore: number
  kellySize: number
  expectedValue: number
  isHighAlpha: boolean
  recommendation: string
  deadline: bigint
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const cleanString = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const formatPercent = (value: number, decimals = 1) => `${round(value, decimals).toFixed(decimals)}%`

const formatUsdcAmount = (value: bigint) => {
  const formatted = formatUnits(value, USDC_DECIMALS)
  const numeric = Number(formatted)

  if (Number.isFinite(numeric)) {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(numeric)} USDC`
  }

  return `${formatted} USDC`
}

const formatCountdown = (deadline: bigint, nowMs: number) => {
  if (deadline === 0n) return 'no deadline'

  const secondsLeft = Math.max(0, Math.floor(Number(deadline) - nowMs / 1000))
  if (secondsLeft <= 0) return 'closed'

  const days = Math.floor(secondsLeft / 86_400)
  const hours = Math.floor((secondsLeft % 86_400) / 3_600)
  const minutes = Math.floor((secondsLeft % 3_600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`

  const seconds = secondsLeft % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

const toBigIntValue = (value: unknown) => (typeof value === 'bigint' ? value : 0n)

const toNumberValue = (value: unknown) => {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return 0
}

const normalizeContractMarket = (marketId: bigint, value: unknown): ContractMarket | null => {
  if (!Array.isArray(value) || value.length < 14) return null

  const title = cleanString(value[1])
  if (!title) return null

  return {
    id: marketId,
    marketId: marketId.toString(),
    creator: cleanString(value[0]),
    title,
    description: cleanString(value[2]),
    resolutionCriteria: cleanString(value[3]),
    deadline: toBigIntValue(value[4]),
    aiProbability: clamp(toNumberValue(value[5]), 0, 100),
    category: cleanString(value[6]),
    triggeredByNews: cleanString(value[7]),
    totalYes: toBigIntValue(value[8]),
    totalNo: toBigIntValue(value[9]),
    liquidity: toBigIntValue(value[10]),
    pool: toBigIntValue(value[11]),
    outcome: toNumberValue(value[12]),
    resolved: Boolean(value[13]),
  }
}

const getCrowdOdds = (market: ContractMarket) => {
  const volume = market.totalYes + market.totalNo
  if (volume === 0n) return null

  return Number((market.totalYes * 10_000n) / volume) / 100
}

const calculateKelly = (aiProbability: number, crowdOdds: number) => {
  const aiYes = clamp(aiProbability / 100, 0, 1)
  const crowdYes = clamp(crowdOdds / 100, 0, 1)
  const targetSide: Exclude<BetSide, 'PASS'> = aiYes >= crowdYes ? 'YES' : 'NO'
  const p = targetSide === 'YES' ? aiYes : 1 - aiYes
  const impliedProbability = targetSide === 'YES' ? crowdYes : 1 - crowdYes

  if (impliedProbability <= 0 || impliedProbability >= 1) {
    return {
      side: 'PASS' as BetSide,
      kellySize: 0,
      expectedValue: 0,
    }
  }

  const odds = 1 / impliedProbability
  const b = odds - 1
  const q = 1 - p
  const kellySize = b > 0 ? clamp((b * p - q) / b, 0, 1) : 0
  const expectedValue = p * odds - 1

  return {
    side: kellySize > 0 ? targetSide : 'PASS' as BetSide,
    kellySize,
    expectedValue,
  }
}

const buildOpportunity = (market: ContractMarket, crowdOdds: number): BetOpportunity => {
  const disagreementScore = round(Math.abs(market.aiProbability - crowdOdds), 1)
  const kelly = calculateKelly(market.aiProbability, crowdOdds)
  const isHighAlpha = disagreementScore > 15
  const recommendation = kelly.side === 'PASS'
    ? 'PASS'
    : isHighAlpha
      ? `HIGH_ALPHA_BET_${kelly.side}`
      : `BET_${kelly.side}`

  return {
    marketId: market.marketId,
    title: market.title,
    side: kelly.side,
    aiProbability: market.aiProbability,
    crowdOdds,
    disagreementScore,
    kellySize: round(kelly.kellySize * 100, 1),
    expectedValue: round(kelly.expectedValue * 100, 1),
    isHighAlpha,
    recommendation,
    deadline: market.deadline,
  }
}

export default function BetsPage() {
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null)
  const [kellyFractions, setKellyFractions] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const {
    data: marketCountData,
    isLoading: marketCountLoading,
  } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCount',
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const marketCount = typeof marketCountData === 'bigint' ? marketCountData : 0n

  const marketIds = useMemo(
    () => Array.from({ length: Number(marketCount) }, (_, index) => BigInt(index)),
    [marketCount],
  )

  const marketReadContracts = useMemo(() => marketIds.map((marketId) => ({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'markets',
    args: [marketId],
    chainId: ARC_TESTNET_CHAIN_ID,
  } as const)), [marketIds])

  const {
    data: marketResults,
    isLoading: marketsLoading,
  } = useReadContracts({
    contracts: marketReadContracts,
    query: { enabled: marketReadContracts.length > 0 },
  })

  const markets = useMemo(() => (marketResults ?? [])
    .map((result, index) => (result.status === 'success'
      ? normalizeContractMarket(marketIds[index], result.result)
      : null))
    .filter((market): market is ContractMarket => market !== null)
    .filter((market) => !market.resolved),
  [marketIds, marketResults])

  const marketsById = useMemo(
    () => new Map(markets.map((market) => [market.marketId, market])),
    [markets],
  )

  const opportunities = useMemo(() => markets
    .map((market) => {
      const crowdOdds = getCrowdOdds(market)
      return crowdOdds === null ? null : buildOpportunity(market, crowdOdds)
    })
    .filter((opportunity): opportunity is BetOpportunity => opportunity !== null),
  [markets])

  const pendingMarkets = useMemo(() => markets.filter((market) => getCrowdOdds(market) === null), [markets])
  const bestEdge = opportunities.reduce((best, opportunity) => Math.max(best, opportunity.disagreementScore), 0)
  const actionableCount = opportunities.filter((opportunity) => opportunity.side !== 'PASS').length
  const isLoadingMarkets = marketCountLoading || marketsLoading

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="nav-tabs page-anim page-anim-1">
          <Link href="/portfolio" className="nav-tab">Portfolio</Link>
          <Link href="/markets" className="nav-tab">Markets</Link>
          <Link href="/bets" className="nav-tab active">Bets</Link>
        </div>

        <div className="page-heading page-anim page-anim-2">
          <div className="page-tag">RFB 2 · BetAgent</div>
          <h1 className="page-title">Kelly Betting and Edge Monitor</h1>
          <p className="page-sub">BetAgent sizes opportunities from contract AI probability and real YES/NO USDC totals.</p>
        </div>

        <div className="grid-2">
          <div className="card page-anim page-anim-3">
            <div className="card-title">Opportunity Mode</div>
            <div className={`regime-badge ${actionableCount > 0 ? 'regime-on' : 'regime-analyzing'}`}>
              <span className="regime-dot"></span>
              {isLoadingMarkets ? 'LOADING' : actionableCount > 0 ? '+EV FOUND' : 'WAITING'}
            </div>

            <div className="allocation-section">
              <div className="card-title">Best Edge</div>
              <div className="stat-num">+{formatPercent(bestEdge)}</div>
              <div className="stat-label">contract crowd odds versus contract AI probability</div>
            </div>
          </div>

          <div className="card page-anim page-anim-4">
            <div className="card-title">BetAgent Snapshot</div>
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="portfolio-asset-cell">Open markets</td>
                  <td className="portfolio-amount-cell">{markets.length}</td>
                  <td className="portfolio-value-cell">{markets.length > 0 ? 'Contract' : 'Empty'}</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Priced opportunities</td>
                  <td className="portfolio-amount-cell">{opportunities.length}</td>
                  <td className="portfolio-value-cell">{opportunities.length > 0 ? 'Ready' : 'Awaiting bets'}</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Actionable bets</td>
                  <td className="portfolio-amount-cell">{actionableCount}</td>
                  <td className="portfolio-value-cell">{actionableCount > 0 ? 'Actionable' : 'Waiting'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-grid page-anim page-anim-5">
          <div className="card dashboard-card-wide">
            <div className="card-title">Opportunity Board</div>
            {isLoadingMarkets ? (
              <div className="empty-market-state">
                <p>Loading contract markets...</p>
              </div>
            ) : marketCount === 0n || markets.length === 0 ? (
              <div className="empty-market-state">
                <p>
                  No open markets yet. <Link href="/markets">Go to Markets tab and run MarketAgent to create markets first.</Link>
                </p>
              </div>
            ) : (
              <div className="market-list">
                {opportunities.map((opportunity) => {
                  const market = marketsById.get(opportunity.marketId)
                  const isExpanded = expandedMarket === opportunity.marketId
                  const kellySize = kellyFractions[opportunity.marketId] ?? opportunity.kellySize
                  const pool = market?.pool ?? 0n
                  const baseStake = Number(formatUnits(pool, USDC_DECIMALS)) * (kellySize / 100)
                  const edgeSign = opportunity.aiProbability >= opportunity.crowdOdds ? '+' : '-'

                  return (
                    <div className="market-row bet-opportunity-row" key={opportunity.marketId}>
                      <div>
                        <div className="market-kicker">
                          {opportunity.side} · Kelly {formatPercent(opportunity.kellySize)}
                          <span className="decay-timer">edge decay {formatCountdown(opportunity.deadline, now)}</span>
                          {opportunity.isHighAlpha ? <span className="alpha-badge">HIGH ALPHA</span> : null}
                        </div>
                        <div className="market-title">{opportunity.title}</div>
                        <button
                          className="simulate-btn"
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedMarket((current) => (current === opportunity.marketId ? null : opportunity.marketId))}
                        >
                          <SlidersHorizontal size={13} aria-hidden="true" />
                          Simulate
                        </button>
                        {isExpanded ? (
                          <div className="kelly-simulator">
                            <label>
                              <span>Kelly</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={kellySize}
                                onChange={(event) => setKellyFractions((current) => ({
                                  ...current,
                                  [opportunity.marketId]: Number(event.target.value),
                                }))}
                              />
                              <strong>{formatPercent(kellySize)}</strong>
                            </label>
                            <div>
                              <span>Pool basis</span>
                              <strong>{formatUsdcAmount(pool)}</strong>
                            </div>
                            <div>
                              <span>Size</span>
                              <strong>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(baseStake)} USDC</strong>
                            </div>
                            <div>
                              <span>EV</span>
                              <strong>{opportunity.expectedValue >= 0 ? '+' : ''}{formatPercent(opportunity.expectedValue)}</strong>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="market-score">
                        <span>{formatPercent(opportunity.aiProbability)}</span>
                        <small>Mkt {formatPercent(opportunity.crowdOdds)}</small>
                        <small className="edge-badge">{edgeSign}{formatPercent(opportunity.disagreementScore)} edge</small>
                        <small>{opportunity.recommendation}</small>
                      </div>
                    </div>
                  )
                })}

                {pendingMarkets.map((market) => (
                  <div className="market-row bet-opportunity-row" key={`pending-${market.marketId}`}>
                    <div>
                      <div className="market-kicker">
                        {market.category || `market #${market.marketId}`}
                        <span className="decay-timer">edge decay {formatCountdown(market.deadline, now)}</span>
                      </div>
                      <div className="market-title">{market.title}</div>
                    </div>
                    <div className="market-score">
                      <span>{formatPercent(market.aiProbability)}</span>
                      <small>No crowd bets yet</small>
                      <small>{formatUsdcAmount(market.pool)} pool</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Agent Log</div>
            <div className="log-box dashboard-log">
              <div className="log-line">BetAgent reads open markets from the deployed PredictionMarket contract.</div>
              <div className="log-line">AI probability, YES/NO totals, pool amounts, and deadlines come from contract reads.</div>
              <div className="log-line">Kelly sizing uses f = (bp - q) / b against current crowd implied odds.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
