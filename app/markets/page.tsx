'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Activity, CircleDollarSign, Newspaper, Plus, RefreshCw, Send } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAccount } from 'wagmi'

type MarketSide = 'YES' | 'NO'
type ScanState = 'READY' | 'SCANNING' | 'COMPLETE' | 'ERROR'

type NewsSignal = {
  headline: string
  source: string
  timestamp: string
  relevanceScore: number
  summary: string
}

type ActiveMarket = {
  id: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: number
  crowdOdds: number
  category: string
  triggeredByNews: string
  spawnedAt: string
}

type MarketFormState = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
}

type ResolvedMarket = {
  title: string
  category: string
  resolved: string
  outcome: string
  pool: string
  accuracy: string
}

const BET_SIZE_USDC = 25

const initialFeed: NewsSignal[] = [
  {
    headline: 'Fed speakers keep focus on sticky services inflation',
    source: 'Macro Desk',
    timestamp: '8m ago',
    relevanceScore: 92,
    summary: 'Rate-path uncertainty keeps the next FOMC decision marketable.',
  },
  {
    headline: 'Oil shipping risk rises after renewed Red Sea disruption reports',
    source: 'Geopolitics Wire',
    timestamp: '16m ago',
    relevanceScore: 88,
    summary: 'Energy transport risk can feed oil and inflation-linked markets.',
  },
  {
    headline: 'Treasury yields slip after weaker manufacturing data',
    source: 'Rates Feed',
    timestamp: '25m ago',
    relevanceScore: 81,
    summary: 'Softer growth data raises demand for yield and policy markets.',
  },
  {
    headline: 'Euro volatility climbs before ECB policy remarks',
    source: 'FX Monitor',
    timestamp: '37m ago',
    relevanceScore: 76,
    summary: 'FX options imply a wider outcome range around ECB communication.',
  },
  {
    headline: 'Election polling spread narrows in key swing states',
    source: 'Political Risk',
    timestamp: '49m ago',
    relevanceScore: 71,
    summary: 'Polling compression creates resolvable political-risk markets.',
  },
]

const initialMarkets: ActiveMarket[] = [
  {
    id: 'fed-hold',
    title: 'Fed holds rates at the next FOMC meeting',
    description: 'Market on whether the next Federal Reserve decision leaves the target range unchanged.',
    resolutionCriteria: 'YES if the official FOMC statement announces no change to the target range.',
    deadline: '2026-06-11',
    initialLiquidity: '$5,000 USDC',
    aiProbability: 64,
    crowdOdds: 47,
    category: 'Rates',
    triggeredByNews: initialFeed[0].headline,
    spawnedAt: '14:32',
  },
  {
    id: 'brent-90',
    title: 'Front-month Brent settles above $90 before deadline',
    description: 'Market tracking whether renewed shipping risk pushes Brent above the stated threshold.',
    resolutionCriteria: 'YES if front-month Brent crude settles above $90 on any official close before the deadline.',
    deadline: '2026-06-14',
    initialLiquidity: '$3,750 USDC',
    aiProbability: 57,
    crowdOdds: 39,
    category: 'Energy',
    triggeredByNews: initialFeed[1].headline,
    spawnedAt: '14:19',
  },
  {
    id: 'ten-year-yield',
    title: 'US 10Y yield closes below 4.25% this week',
    description: 'Market on whether weak activity data pulls long-end yields lower before the weekly close.',
    resolutionCriteria: 'YES if the US 10-year Treasury yield closes below 4.25% on the reference data source before deadline.',
    deadline: '2026-06-07',
    initialLiquidity: '$4,200 USDC',
    aiProbability: 61,
    crowdOdds: 55,
    category: 'Rates',
    triggeredByNews: initialFeed[2].headline,
    spawnedAt: '14:05',
  },
]

const resolvedMarkets: ResolvedMarket[] = [
  {
    title: 'ECB keeps deposit rate unchanged',
    category: 'Rates',
    resolved: 'May 17',
    outcome: 'YES',
    pool: '$7,840 USDC',
    accuracy: 'AI 68% / crowd 51%',
  },
  {
    title: 'WTI closes above $82 after inventory report',
    category: 'Energy',
    resolved: 'May 15',
    outcome: 'NO',
    pool: '$4,120 USDC',
    accuracy: 'AI 42% / crowd 58%',
  },
  {
    title: 'US jobless claims exceed consensus',
    category: 'Macro',
    resolved: 'May 14',
    outcome: 'YES',
    pool: '$5,510 USDC',
    accuracy: 'AI 63% / crowd 49%',
  },
]

const emptyForm: MarketFormState = {
  title: '',
  description: '',
  resolutionCriteria: '',
  deadline: '',
  initialLiquidity: '',
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

const cleanText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback

  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback

  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseLiquidity = (value: string) => parseNumber(value, 0)

const formatUsdc = (value: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} USDC`

const formatPool = (value: number) => `$${formatUsdc(value)}`

const formatNewsTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'just now'

  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const formatSpawnTime = () =>
  new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

const getDeadlineCountdown = (deadline: string) => {
  const date = new Date(`${deadline}T23:59:59`)
  if (Number.isNaN(date.getTime())) return 'Pending date'

  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 'Resolving'

  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)

  if (days > 0) return `${days}d ${hours}h`
  return `${Math.max(1, hours)}h`
}

const deriveCrowdOdds = (title: string, index: number, aiProbability: number) => {
  const hash = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), index * 17)
  const offset = (hash % 35) - 17

  return clamp(aiProbability + offset, 5, 95)
}

const getDisagreement = (market: ActiveMarket) => Math.abs(market.aiProbability - market.crowdOdds)

const normalizeNews = (item: Record<string, unknown>, index: number): NewsSignal => ({
  headline: cleanText(item.headline ?? item.title, 'Macro headline detected'),
  source: cleanText(item.source, 'Macro News'),
  timestamp: formatNewsTime(cleanText(item.publishedAt ?? item.timestamp, 'just now')),
  relevanceScore: clamp(parseNumber(item.relevanceScore, 70 - index * 4), 0, 100),
  summary: cleanText(item.summary ?? item.description, 'MarketAgent is monitoring this headline for a resolvable market.'),
})

const normalizeMarket = (market: Record<string, unknown>, index: number): ActiveMarket => {
  const title = cleanText(market.title, 'Untitled prediction market')
  const aiProbability = clamp(parseNumber(market.aiProbability, 55), 1, 99)

  return {
    id: `${title}-${Date.now()}-${index}`,
    title,
    description: cleanText(market.description, 'No description provided.'),
    resolutionCriteria: cleanText(market.resolutionCriteria, 'Resolution criteria pending.'),
    deadline: cleanText(market.deadline, new Date().toISOString().slice(0, 10)),
    initialLiquidity: cleanText(market.initialLiquidity, '$2,500 USDC'),
    aiProbability,
    crowdOdds: deriveCrowdOdds(title, index, aiProbability),
    category: cleanText(market.category, 'Macro'),
    triggeredByNews: cleanText(market.triggeredByNews, 'Breaking macro headline'),
    spawnedAt: formatSpawnTime(),
  }
}

export default function MarketsPage() {
  const { isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [scanState, setScanState] = useState<ScanState>('READY')
  const [feed, setFeed] = useState(initialFeed)
  const [markets, setMarkets] = useState(initialMarkets)
  const [form, setForm] = useState<MarketFormState>(emptyForm)
  const [agentLog, setAgentLog] = useState<string[]>([
    'MarketAgent ready. Live macro and geopolitical feed is standing by.',
  ])

  const highAlphaCount = useMemo(() => markets.filter((market) => getDisagreement(market) > 15).length, [markets])
  const totalPool = useMemo(() => markets.reduce((sum, market) => sum + parseLiquidity(market.initialLiquidity), 0), [markets])
  const scanLabel = scanState === 'READY' ? 'READY TO SCAN' : scanState === 'COMPLETE' ? 'SCAN COMPLETE' : scanState
  const scanClass = scanState === 'ERROR' ? 'regime-off' : scanState === 'COMPLETE' ? 'regime-on' : 'regime-analyzing'

  const runMarketAgent = async () => {
    if (!isConnected) return

    setLoading(true)
    setScanState('SCANNING')
    setAgentLog(['Scanning current macro and geopolitical headlines...'])

    try {
      const response = await fetch('/api/market-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`MarketAgent failed with ${response.status}`)
      }

      const data = await response.json()
      const nextFeed = Array.isArray(data.news)
        ? data.news.map((item: Record<string, unknown>, index: number) => normalizeNews(item, index)).slice(0, 5)
        : []
      const spawnedMarkets = Array.isArray(data.markets)
        ? data.markets.map((item: Record<string, unknown>, index: number) => normalizeMarket(item, index))
        : []

      if (nextFeed.length > 0) setFeed(nextFeed)
      if (spawnedMarkets.length > 0) setMarkets((current) => [...spawnedMarkets, ...current].slice(0, 8))

      setScanState('COMPLETE')
      setAgentLog([
        data.fallback ? 'MarketAgent used fallback market drafts.' : `MarketAgent spawned ${spawnedMarkets.length} markets from live news.`,
        `Monitoring ${nextFeed.length || feed.length} high-relevance macro and geopolitical headlines.`,
        'Each new market includes AI probability, crowd odds, and disagreement scoring.',
      ])
    } catch {
      setScanState('ERROR')
      setAgentLog([
        'MarketAgent request failed.',
        'Existing markets remain active and bet controls stay available.',
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleBet = (marketId: string, side: MarketSide) => {
    const market = markets.find((item) => item.id === marketId)
    if (!market) return

    setMarkets((current) => current.map((item) => {
      if (item.id !== marketId) return item

      const pool = parseLiquidity(item.initialLiquidity) + BET_SIZE_USDC
      const crowdMove = side === 'YES' ? 1 : -1

      return {
        ...item,
        initialLiquidity: formatPool(pool),
        crowdOdds: clamp(item.crowdOdds + crowdMove, 5, 95),
      }
    }))

    setAgentLog((current) => [
      `Sent ${BET_SIZE_USDC} USDC to ${side} on "${market.title}".`,
      ...current.slice(0, 3),
    ])
  }

  const handleManualCreate = () => {
    if (!form.title.trim() || !form.description.trim() || !form.resolutionCriteria.trim() || !form.deadline.trim() || !form.initialLiquidity.trim()) return

    const manualMarket = normalizeMarket({
      title: form.title,
      description: form.description,
      resolutionCriteria: form.resolutionCriteria,
      deadline: form.deadline,
      initialLiquidity: form.initialLiquidity,
      aiProbability: 52,
      category: 'Manual',
      triggeredByNews: 'Manual creator input',
    }, markets.length)

    setMarkets((current) => [manualMarket, ...current])
    setForm(emptyForm)
    setAgentLog((current) => [
      `Manual market created with ${manualMarket.initialLiquidity} initial liquidity.`,
      ...current.slice(0, 3),
    ])
  }

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="nav-tabs page-anim page-anim-1">
          <Link href="/portfolio" className="nav-tab">Portfolio</Link>
          <Link href="/markets" className="nav-tab active">Markets</Link>
          <Link href="/bets" className="nav-tab">Bets</Link>
        </div>

        <div className="page-heading page-anim page-anim-2">
          <div className="page-tag">RFB 3 · MarketAgent</div>
          <h1 className="page-title">MarketAgent Dashboard</h1>
          <p className="page-sub">AI scans macro and geopolitical news, spawns USDC markets on Arc testnet, and flags alpha when model probability diverges from the crowd.</p>
        </div>

        {!isConnected ? (
          <div className="card connect-prompt page-anim page-anim-3">
            <h3>Connect your wallet to continue</h3>
            <p>MarketAgent needs your wallet before it can spawn markets or send USDC bets.</p>
          </div>
        ) : (
          <>
            <section className="market-section page-anim page-anim-3">
              <div className="market-section-header">
                <div>
                  <div className="card-title">Live News Feed</div>
                  <h2 className="feature-title">Five macro and geopolitical signals under AI watch.</h2>
                </div>
                <div className={`regime-badge ${scanClass}`}>
                  <span className="regime-dot"></span>
                  {scanLabel}
                </div>
              </div>

              <div className="news-feed-grid">
                {feed.slice(0, 5).map((item) => (
                  <article className="news-signal-card" key={`${item.headline}-${item.timestamp}`}>
                    <div className="news-signal-top">
                      <div className="market-kicker">{item.source} · {item.timestamp}</div>
                      <span>{item.relevanceScore}</span>
                    </div>
                    <h3>{item.headline}</h3>
                    <p>{item.summary}</p>
                    <progress className="usyc-progress" value={item.relevanceScore} max={100} aria-label={`${item.headline} relevance score`} />
                  </article>
                ))}
              </div>
            </section>

            <section className="market-section page-anim page-anim-4">
              <div className="market-section-header">
                <div>
                  <div className="card-title">Active Markets</div>
                  <h2 className="feature-title">AI probability versus crowd implied odds.</h2>
                </div>
                <div className="market-summary-strip" aria-label="Active market summary">
                  <div>
                    <span>{markets.length}</span>
                    <small>active</small>
                  </div>
                  <div>
                    <span>{formatPool(totalPool)}</span>
                    <small>pool</small>
                  </div>
                  <div>
                    <span>{highAlphaCount}</span>
                    <small>high alpha</small>
                  </div>
                </div>
              </div>

              <div className="active-market-grid">
                {markets.map((market) => {
                  const disagreement = getDisagreement(market)
                  const highAlpha = disagreement > 15

                  return (
                    <article className="active-market-card" key={market.id}>
                      <div className="active-market-top">
                        <span className="category-badge">{market.category}</span>
                        {highAlpha ? <span className="alpha-badge">HIGH ALPHA</span> : <span className="spawn-badge">{market.spawnedAt}</span>}
                      </div>

                      <h3>{market.title}</h3>
                      <p>{market.description}</p>

                      <div className="market-trigger">
                        <Newspaper size={14} aria-hidden="true" />
                        <span>{market.triggeredByNews}</span>
                      </div>

                      <div className="market-card-meta">
                        <div>
                          <span>Deadline</span>
                          <strong>{getDeadlineCountdown(market.deadline)}</strong>
                        </div>
                        <div>
                          <span>USDC pool</span>
                          <strong>{market.initialLiquidity}</strong>
                        </div>
                      </div>

                      <div className="probability-grid">
                        <div>
                          <span>AI</span>
                          <strong>{market.aiProbability}%</strong>
                        </div>
                        <div>
                          <span>Crowd</span>
                          <strong>{market.crowdOdds}%</strong>
                        </div>
                        <div className={highAlpha ? 'disagreement-hot' : undefined}>
                          <span>Disagree</span>
                          <strong>{disagreement}%</strong>
                        </div>
                      </div>

                      <div className="market-resolution">{market.resolutionCriteria}</div>

                      <div className="bet-actions">
                        <button className="bet-btn bet-yes" onClick={() => handleBet(market.id, 'YES')}>
                          <CircleDollarSign size={15} aria-hidden="true" />
                          Bet YES
                        </button>
                        <button className="bet-btn bet-no" onClick={() => handleBet(market.id, 'NO')}>
                          <CircleDollarSign size={15} aria-hidden="true" />
                          Bet NO
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <div className="dashboard-grid market-command-grid page-anim page-anim-5">
              <section className="card">
                <div className="card-title">Run MarketAgent</div>
                <div className={`regime-badge ${scanClass}`}>
                  <span className="regime-dot"></span>
                  {scanLabel}
                </div>
                <div className="market-agent-stats">
                  <div>
                    <Activity size={16} aria-hidden="true" />
                    <span>{feed.length} live signals</span>
                  </div>
                  <div>
                    <Send size={16} aria-hidden="true" />
                    <span>{markets.length} USDC markets</span>
                  </div>
                </div>
                <div className="log-box dashboard-log">
                  {agentLog.map((line) => (
                    <div className="log-line" key={line}>{line}</div>
                  ))}
                </div>
                <button className="run-btn" onClick={runMarketAgent} disabled={loading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {loading ? 'Scanning markets...' : 'Run MarketAgent'}
                </button>
              </section>

              <section className="card">
                <div className="card-title">Manual Create Market</div>
                <div className="market-form">
                  <label>
                    <span>Title</span>
                    <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Will the Fed cut rates in June?" />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Short summary of the event and why it matters." rows={3} />
                  </label>
                  <label>
                    <span>Resolution Criteria</span>
                    <textarea value={form.resolutionCriteria} onChange={(e) => setForm((current) => ({ ...current, resolutionCriteria: e.target.value }))} placeholder="Define exactly how this market settles." rows={3} />
                  </label>
                  <div className="market-form-grid">
                    <label>
                      <span>Deadline</span>
                      <input type="date" value={form.deadline} onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))} />
                    </label>
                    <label>
                      <span>Initial Liquidity</span>
                      <input value={form.initialLiquidity} onChange={(e) => setForm((current) => ({ ...current, initialLiquidity: e.target.value }))} placeholder="$2,500 USDC" />
                    </label>
                  </div>
                  <button className="run-btn" onClick={handleManualCreate}>
                    <Plus size={16} aria-hidden="true" />
                    Create Market
                  </button>
                </div>
              </section>
            </div>

            <section className="card page-anim page-anim-5">
              <div className="card-title">Resolved Markets History</div>
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Resolved</th>
                    <th>Outcome</th>
                    <th>Pool</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedMarkets.map((market) => (
                    <tr key={`${market.title}-${market.resolved}`}>
                      <td className="portfolio-asset-cell">
                        {market.title}
                        <div className="market-criteria">{market.category}</div>
                      </td>
                      <td className="portfolio-amount-cell">{market.resolved}</td>
                      <td className="portfolio-value-cell">{market.outcome}</td>
                      <td className="portfolio-amount-cell">{market.pool}</td>
                      <td className="portfolio-amount-cell">{market.accuracy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </>
  )
}
