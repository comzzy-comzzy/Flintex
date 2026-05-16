import Link from 'next/link'
import Navbar from '@/components/Navbar'

const opportunities = [
  {
    market: 'FOMC statement mentions slowing growth',
    side: 'YES',
    marketOdds: '61%',
    modelOdds: '72%',
    kelly: '8.6%',
  },
  {
    market: 'Brent closes above $90 before Friday',
    side: 'NO',
    marketOdds: '56%',
    modelOdds: '64%',
    kelly: '5.1%',
  },
  {
    market: 'EUR/USD trades above 1.10 this week',
    side: 'YES',
    marketOdds: '38%',
    modelOdds: '45%',
    kelly: '3.4%',
  },
]

const positions = [
  {
    market: 'Fed holds current target range',
    stake: '$1,240',
    pnl: '+$182',
    status: 'Live',
  },
  {
    market: 'CPI lands below consensus',
    stake: '$760',
    pnl: '+$44',
    status: 'Live',
  },
  {
    market: 'Oil volatility closes elevated',
    stake: '$410',
    pnl: '-$18',
    status: 'Hedged',
  },
]

const betLog = [
  'Compared model probability against live market implied odds.',
  'Flagged 3 opportunities above minimum edge threshold.',
  'Applied half-Kelly cap to protect shared capital pool.',
  'Queued two positions for execution after liquidity check.',
]

export default function BetsPage() {
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
          <p className="page-sub">BetAgent compares model probability to market prices, sizes positions with Kelly discipline, and tracks live PnL.</p>
        </div>

        <div className="grid-2">
          <div className="card page-anim page-anim-3">
            <div className="card-title">Opportunity Mode</div>
            <div className="regime-badge regime-on">
              <span className="regime-dot"></span>
              +EV FOUND
            </div>

            <div className="allocation-section">
              <div className="card-title">Capital at Risk</div>
              <div className="stat-num">17%</div>
              <progress className="usyc-progress" value={17} max={100} aria-label="BetAgent capital at risk" />
              <div className="stat-label">of agent allocation after Kelly caps</div>
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
                  <td className="portfolio-asset-cell">Best edge</td>
                  <td className="portfolio-amount-cell">+11%</td>
                  <td className="portfolio-value-cell">Actionable</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Active bets</td>
                  <td className="portfolio-amount-cell">3</td>
                  <td className="portfolio-value-cell">Tracked</td>
                </tr>
                <tr>
                  <td className="portfolio-asset-cell">Net PnL</td>
                  <td className="portfolio-amount-cell">+$208</td>
                  <td className="portfolio-value-cell">Open</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-grid page-anim page-anim-5">
          <div className="card dashboard-card-wide">
            <div className="card-title">Opportunity Board</div>
            <div className="market-list">
              {opportunities.map((opportunity) => (
                <div className="market-row" key={opportunity.market}>
                  <div>
                    <div className="market-kicker">{opportunity.side} · Kelly {opportunity.kelly}</div>
                    <div className="market-title">{opportunity.market}</div>
                  </div>
                  <div className="market-score">
                    <span>{opportunity.modelOdds}</span>
                    <small>Mkt {opportunity.marketOdds}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Agent Log</div>
            <div className="log-box dashboard-log">
              {betLog.map((line) => (
                <div className="log-line" key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="card page-anim page-anim-5">
          <div className="card-title">Position Ledger</div>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Stake</th>
                <th>PnL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.market}>
                  <td className="portfolio-asset-cell">{position.market}</td>
                  <td className="portfolio-amount-cell">{position.stake}</td>
                  <td className="portfolio-value-cell">{position.pnl}</td>
                  <td className="portfolio-amount-cell">{position.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
