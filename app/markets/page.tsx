import Link from 'next/link'
import Navbar from '@/components/Navbar'

const marketSignals = [
  {
    source: 'Fed Watch',
    title: 'June FOMC holds rates at current target range',
    score: 92,
    window: '18h',
    status: 'Ready',
  },
  {
    source: 'CPI Desk',
    title: 'Next CPI print lands below consensus estimate',
    score: 84,
    window: '2d',
    status: 'Drafting',
  },
  {
    source: 'Election Wire',
    title: 'Polling leader flips before the next debate',
    score: 77,
    window: '5d',
    status: 'Watching',
  },
]

const openMarkets = [
  {
    question: 'Will the next FOMC statement mention slowing growth?',
    liquidity: '$8,420',
    probability: '61%',
    currency: 'USDC',
  },
  {
    question: 'Will Brent close above $90 before Friday?',
    liquidity: '$5,180',
    probability: '44%',
    currency: 'USDC',
  },
  {
    question: 'Will EUR/USD trade above 1.10 this week?',
    liquidity: '€3,950',
    probability: '38%',
    currency: 'EURC',
  },
]

const pipelineLog = [
  'Ingested 132 macro headlines from monitored sources.',
  'Filtered 9 candidate events with binary resolution paths.',
  'Prepared 3 markets with liquidity, oracle, and settlement metadata.',
  'Queued top FOMC market for Arc deployment review.',
]

export default function MarketsPage() {
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
          <h1 className="page-title">Prediction Market Command Center</h1>
          <p className="page-sub">MarketAgent scans macro events, turns clean binary outcomes into Arc markets, and tracks liquidity readiness.</p>
        </div>

        <div className="grid-2">
          <div className="card page-anim page-anim-3">
            <div className="card-title">Scanner Status</div>
            <div className="regime-badge regime-on">
              <span className="regime-dot"></span>
              LIVE
            </div>

            <div className="allocation-section">
              <div className="card-title">Signal Quality</div>
              <div className="stat-num">92%</div>
              <progress className="usyc-progress" value={92} max={100} aria-label="MarketAgent signal quality" />
              <div className="stat-label">top candidate confidence</div>
            </div>
          </div>

          <div className="card page-anim page-anim-4">
            <div className="card-title">MarketAgent Queue</div>
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Count</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="portfolio-asset-cell">Signals</td>
                  <td className="portfolio-amount-cell">132</td>
                  <td className="portfolio-value-cell">Scanned</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Candidates</td>
                  <td className="portfolio-amount-cell">9</td>
                  <td className="portfolio-value-cell">Ranked</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Markets</td>
                  <td className="portfolio-amount-cell">3</td>
                  <td className="portfolio-value-cell">Drafted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-grid page-anim page-anim-5">
          <div className="card dashboard-card-wide">
            <div className="card-title">Signal Queue</div>
            <div className="market-list">
              {marketSignals.map((signal) => (
                <div className="market-row" key={signal.title}>
                  <div>
                    <div className="market-kicker">{signal.source} · {signal.window}</div>
                    <div className="market-title">{signal.title}</div>
                  </div>
                  <div className="market-score">
                    <span>{signal.score}</span>
                    <small>{signal.status}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Agent Log</div>
            <div className="log-box dashboard-log">
              {pipelineLog.map((line) => (
                <div className="log-line" key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="card page-anim page-anim-5">
          <div className="card-title">Open Market Drafts</div>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Liquidity</th>
                <th>Implied</th>
                <th>Settle</th>
              </tr>
            </thead>
            <tbody>
              {openMarkets.map((market) => (
                <tr key={market.question}>
                  <td className="portfolio-asset-cell">{market.question}</td>
                  <td className="portfolio-amount-cell">{market.liquidity}</td>
                  <td className="portfolio-value-cell">{market.probability}</td>
                  <td className="portfolio-amount-cell">{market.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
