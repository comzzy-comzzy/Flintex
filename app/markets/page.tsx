'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useAccount } from 'wagmi'

type MarketDraft = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
}

type MarketFormState = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
}

type FeedItem = {
  source: string
  headline: string
  summary: string
  time: string
}

type ScanState = 'READY' | 'SCANNING' | 'COMPLETE' | 'ERROR'

const initialMarkets: MarketDraft[] = [
  {
    title: 'FOMC keeps rates unchanged',
    description: 'Market on whether the next Fed decision leaves the target range unchanged.',
    resolutionCriteria: 'YES if the official FOMC statement does not announce a rate change.',
    deadline: '2026-06-11',
    initialLiquidity: '$8,400 USDC',
  },
  {
    title: 'CPI prints below consensus',
    description: 'Track the next US CPI release against consensus expectations.',
    resolutionCriteria: 'YES if the published CPI print is below the consensus estimate.',
    deadline: '2026-06-13',
    initialLiquidity: '$5,250 USDC',
  },
  {
    title: 'Brent closes above $90',
    description: 'Short-term macro commodity market around oil price strength.',
    resolutionCriteria: 'YES if front-month Brent settles above $90 at deadline.',
    deadline: '2026-06-14',
    initialLiquidity: '$3,950 USDC',
  },
]

const initialFeed: FeedItem[] = [
  {
    source: 'Macro Desk',
    headline: 'Fed speakers stay cautious on inflation path',
    summary: 'Repeated emphasis on sticky services inflation lifts the odds of a hold.',
    time: '2m ago',
  },
  {
    source: 'Geopolitics',
    headline: 'Energy routes face new shipping disruption risk',
    summary: 'A fresh supply shock could widen oil and freight market volatility.',
    time: '7m ago',
  },
  {
    source: 'Rates Feed',
    headline: 'Treasury yields slip after weak economic data',
    summary: 'Lower yields strengthen the case for a slower policy path.',
    time: '14m ago',
  },
]

const emptyForm: MarketFormState = {
  title: '',
  description: '',
  resolutionCriteria: '',
  deadline: '',
}

const normalizeMarket = (market: Partial<MarketDraft>): MarketDraft => ({
  title: market.title?.trim() || 'Untitled market',
  description: market.description?.trim() || 'No description provided.',
  resolutionCriteria: market.resolutionCriteria?.trim() || 'Unspecified resolution criteria.',
  deadline: market.deadline?.trim() || new Date().toISOString().slice(0, 10),
  initialLiquidity: market.initialLiquidity?.trim() || '$0 USDC',
})

const formatFeedTime = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return 'latest'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'latest'

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const cleanFeedText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback

  const cleaned = value
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ')
    .replace(/<font\b[^>]*>[\s\S]*?<\/font>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned || fallback
}

export default function MarketsPage() {
  const { isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [scanState, setScanState] = useState<ScanState>('READY')
  const [feed, setFeed] = useState(initialFeed)
  const [markets, setMarkets] = useState(initialMarkets)
  const [agentLog, setAgentLog] = useState<string[]>([
    'MarketAgent ready. Click Run MarketAgent to scan live macro news.',
  ])
  const [form, setForm] = useState<MarketFormState>(emptyForm)

  const connectedCount = useMemo(() => markets.length, [markets.length])

  const runMarketAgent = async () => {
    if (!isConnected) return

    setLoading(true)
    setScanState('SCANNING')
    setAgentLog(['Scanning real macro and geopolitical news...'])

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
      const nextMarkets: MarketDraft[] = Array.isArray(data.markets) ? data.markets.map(normalizeMarket) : []
      const nextFeed: FeedItem[] = Array.isArray(data.newsItems)
        ? data.newsItems.map((item: Record<string, unknown>) => ({
          source: cleanFeedText(item.source, 'Macro News'),
          headline: cleanFeedText(item.title, 'Macro event detected'),
          summary: cleanFeedText(item.description, 'MarketAgent included this event in the scan.'),
          time: formatFeedTime(item.publishedAt),
        }))
        : []

      if (nextMarkets.length > 0) {
        setMarkets(nextMarkets)
      }

      if (nextFeed.length > 0) {
        setFeed(nextFeed.slice(0, 6))
      }

      setScanState('COMPLETE')
      setAgentLog([
        data.fallback ? 'MarketAgent used fallback market drafts.' : `MarketAgent returned ${nextMarkets.length} markets.`,
        `Scanned ${nextFeed.length} macro and geopolitical headlines.`,
        'Draft liquidity assigned for top-ranked events.',
      ])
    } catch {
      setScanState('ERROR')
      setAgentLog([
        'MarketAgent request failed.',
        'Falling back to existing market drafts.',
      ])
    } finally {
      setLoading(false)
    }
  }

  const scanLabel = scanState === 'READY' ? 'READY TO SCAN' : scanState === 'COMPLETE' ? 'SCAN COMPLETE' : scanState
  const scanClass = scanState === 'ERROR' ? 'regime-off' : scanState === 'COMPLETE' ? 'regime-on' : 'regime-analyzing'

  const handleManualCreate = () => {
    if (!form.title.trim() || !form.description.trim() || !form.resolutionCriteria.trim() || !form.deadline.trim()) return

    setMarkets((current) => [
      {
        title: form.title.trim(),
        description: form.description.trim(),
        resolutionCriteria: form.resolutionCriteria.trim(),
        deadline: form.deadline.trim(),
        initialLiquidity: '$2,500 USDC',
      },
      ...current,
    ])

    setForm(emptyForm)
    setAgentLog((current) => [
      'Manual market draft added.',
      ...current.slice(0, 2),
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
          <p className="page-sub">Scan macro and geopolitical news, create prediction markets, and manage liquidity from one dark ice-blue surface.</p>
        </div>

        {!isConnected ? (
          <div className="card connect-prompt page-anim page-anim-3">
            <h3>Connect your wallet to continue</h3>
            <p>MarketAgent will scan live macro and geopolitical news once your wallet is connected.</p>
          </div>
        ) : (
          <>
            <div className="grid-2">
              <div className="card page-anim page-anim-3">
                <div className="card-title">News Scan</div>
                <div className={`regime-badge ${scanClass}`}>
                  <span className="regime-dot"></span>
                  {scanLabel}
                </div>
                <div className="allocation-section">
                  <div className="card-title">Live Coverage</div>
                  <div className="stat-num">{feed.length}</div>
                  <progress className="usyc-progress" value={feed.length} max={6} aria-label="Market feed coverage" />
                  <div className="stat-label">macro and geopolitical events queued</div>
                </div>
              </div>

              <div className="card page-anim page-anim-4">
                <div className="card-title">MarketAgent Summary</div>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="portfolio-asset-cell">Connected</td>
                      <td className="portfolio-amount-cell">{isConnected ? 'Yes' : 'No'}</td>
                      <td className="portfolio-value-cell">Wallet gated</td>
                    </tr>
                    <tr>
                      <td className="portfolio-asset-cell">Created markets</td>
                      <td className="portfolio-amount-cell">{connectedCount}</td>
                      <td className="portfolio-value-cell">Active</td>
                    </tr>
                    <tr>
                      <td className="portfolio-asset-cell">Manual drafts</td>
                      <td className="portfolio-amount-cell">{form.title ? '1' : '0'}</td>
                      <td className="portfolio-value-cell">Editable</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dashboard-grid page-anim page-anim-5">
              <div className="card dashboard-card-wide">
                <div className="card-title">News Feed</div>
                <div className="market-list">
                  {feed.map((item) => (
                    <div className="market-row" key={`${item.headline}-${item.time}`}>
                      <div>
                        <div className="market-kicker">{item.source} · {item.time}</div>
                        <div className="market-title">{item.headline}</div>
                        <div className="page-sub" style={{ marginTop: '6px' }}>{item.summary}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Agent Log</div>
                <div className="log-box dashboard-log">
                  {agentLog.map((line) => (
                    <div className="log-line" key={line}>{line}</div>
                  ))}
                </div>
                <button className="run-btn" onClick={runMarketAgent} disabled={loading}>
                  {loading ? 'Scanning markets...' : 'Run MarketAgent'}
                </button>
              </div>
            </div>

            <div className="card page-anim page-anim-5">
              <div className="card-title">Prediction Markets</div>
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Deadline</th>
                    <th>USDC Pool</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => (
                    <tr key={`${market.title}-${market.deadline}`}>
                      <td className="portfolio-asset-cell">{market.title}</td>
                      <td className="portfolio-amount-cell">
                        <div>{market.description}</div>
                        <div className="market-criteria">{market.resolutionCriteria}</div>
                      </td>
                      <td className="portfolio-value-cell">{market.deadline}</td>
                      <td className="portfolio-amount-cell">{market.initialLiquidity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card page-anim page-anim-5">
              <div className="card-title">Create Market</div>
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
                  <textarea value={form.resolutionCriteria} onChange={(e) => setForm((current) => ({ ...current, resolutionCriteria: e.target.value }))} placeholder="Define exactly how the market settles." rows={3} />
                </label>
                <label>
                  <span>Deadline</span>
                  <input type="date" value={form.deadline} onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))} />
                </label>
                <button className="run-btn" onClick={handleManualCreate}>
                  Create Market
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
