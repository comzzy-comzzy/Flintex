'use client'

import Link from 'next/link'
import { Activity, ArrowRightLeft, CheckCircle2, Clock3, RefreshCw, Timer, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import { type Address, formatUnits, zeroAddress } from 'viem'
import { useAccount, useBalance, useReadContract } from 'wagmi'

const ARC_TESTNET_CHAIN_ID = 5042002
const NATIVE_USDC_DECIMALS = 18
const ERC20_TOKEN_DECIMALS = 6

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const TOKENS = {
  usdc: {
    symbol: 'USDC',
    valuePrefix: '$',
  },
  eurc: {
    symbol: 'EURC',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as Address,
    valuePrefix: '€',
  },
  usyc: {
    symbol: 'USYC',
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as Address,
    valuePrefix: '$',
  },
} as const

type Regime = 'READY' | 'ANALYZING' | 'RISK-ON' | 'RISK-OFF'
type TokenBalance = bigint | undefined
type ActiveRegime = 'RISK-ON' | 'RISK-OFF'
type Hindsight = 'Correct' | 'Missed' | 'Pending'

type RegimeMemoryEvent = {
  id: string
  day: string
  time: string
  from: ActiveRegime
  to: ActiveRegime
  reason: string
  hindsight: Hindsight
  evidence: string
}

type AgentCapital = {
  id: 'portfolio' | 'market' | 'bet'
  name: string
  shortName: string
  color: string
  allocation: number
  opportunityScore: number
  status: string
}

const INITIAL_REGIME_MEMORY: RegimeMemoryEvent[] = [
  {
    id: 'fed-hawkish',
    day: 'Today',
    time: '14:32',
    from: 'RISK-ON',
    to: 'RISK-OFF',
    reason: 'Fed hawkish signal detected across rate-cut pricing and dollar strength.',
    hindsight: 'Pending',
    evidence: 'Awaiting next 6h realized volatility window.',
  },
  {
    id: 'cpi-soft',
    day: 'Mon',
    time: '10:18',
    from: 'RISK-OFF',
    to: 'RISK-ON',
    reason: 'Soft CPI surprise lowered front-end yields and lifted prediction-market liquidity.',
    hindsight: 'Correct',
    evidence: 'USDC opportunity yield stayed stable while risk assets rallied 1.9%.',
  },
  {
    id: 'oil-shock',
    day: 'Sun',
    time: '21:07',
    from: 'RISK-ON',
    to: 'RISK-OFF',
    reason: 'Energy headline shock widened macro uncertainty and raised hedge demand.',
    hindsight: 'Correct',
    evidence: 'Hedged allocation avoided a 0.8% drawdown during the next session.',
  },
  {
    id: 'jobs-fade',
    day: 'Fri',
    time: '08:44',
    from: 'RISK-OFF',
    to: 'RISK-ON',
    reason: 'Labor-market miss faded after liquidity recovered and spreads normalized.',
    hindsight: 'Missed',
    evidence: 'Switch lagged the move; BetAgent found better edge 47 minutes earlier.',
  },
]

const CAPITAL_EVENTS = [
  { from: 'PortfolioAgent', to: 'MarketAgent', amount: '$1,240', reason: 'Macro market seed liquidity' },
  { from: 'MarketAgent', to: 'BetAgent', amount: '$680', reason: 'Mispriced FOMC odds detected' },
  { from: 'BetAgent', to: 'PortfolioAgent', amount: '$430', reason: 'PnL harvested into defensive reserve' },
]

const formatTokenAmount = (balance: TokenBalance, tokenDecimals: number, displayDecimals = 4) => {
  if (balance === undefined) return `0.${'0'.repeat(displayDecimals)}`

  const [whole, fraction = ''] = formatUnits(balance, tokenDecimals).split('.')
  return `${whole}.${fraction.padEnd(displayDecimals, '0').slice(0, displayDecimals)}`
}

const formatTokenValue = (balance: TokenBalance, tokenDecimals: number, prefix: string) => {
  if (balance === undefined) return `${prefix}0.00`

  const [whole, fraction = ''] = formatUnits(balance, tokenDecimals).split('.')
  return `${prefix}${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`
}

const clampAllocation = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

const parseTokenAmount = (balance: TokenBalance, tokenDecimals: number) => {
  if (balance === undefined) return 0
  return Number(formatUnits(balance, tokenDecimals))
}

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const getHindsightClass = (hindsight: Hindsight) => {
  if (hindsight === 'Correct') return 'hindsight-correct'
  if (hindsight === 'Missed') return 'hindsight-missed'
  return 'hindsight-pending'
}

const getHindsightIcon = (hindsight: Hindsight) => {
  if (hindsight === 'Correct') return <CheckCircle2 size={14} aria-hidden="true" />
  if (hindsight === 'Missed') return <XCircle size={14} aria-hidden="true" />
  return <Clock3 size={14} aria-hidden="true" />
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [regime, setRegime] = useState<Regime>('READY')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [usycAlloc, setUsycAlloc] = useState(0)
  const [regimeMemory, setRegimeMemory] = useState<RegimeMemoryEvent[]>(INITIAL_REGIME_MEMORY)
  const [rebalanceCountdown, setRebalanceCountdown] = useState(184)
  const [flowStep, setFlowStep] = useState(0)

  const usdcBalance = useBalance({
    address,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  const eurcBalance = useReadContract({
    address: TOKENS.eurc.address,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  const usycBalance = useReadContract({
    address: TOKENS.usyc.address,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  const portfolio = [
    {
      asset: TOKENS.usdc.symbol,
      amount: formatTokenAmount(usdcBalance.data?.value, NATIVE_USDC_DECIMALS),
      value: formatTokenValue(usdcBalance.data?.value, NATIVE_USDC_DECIMALS, TOKENS.usdc.valuePrefix),
    },
    {
      asset: TOKENS.eurc.symbol,
      amount: formatTokenAmount(eurcBalance.data, ERC20_TOKEN_DECIMALS),
      value: formatTokenValue(eurcBalance.data, ERC20_TOKEN_DECIMALS, TOKENS.eurc.valuePrefix),
    },
    {
      asset: TOKENS.usyc.symbol,
      amount: formatTokenAmount(usycBalance.data, ERC20_TOKEN_DECIMALS),
      value: formatTokenValue(usycBalance.data, ERC20_TOKEN_DECIMALS, TOKENS.usyc.valuePrefix),
    },
  ]

  const usdcAmount = parseTokenAmount(usdcBalance.data?.value, NATIVE_USDC_DECIMALS)
  const totalUsdc = usdcAmount > 0 ? usdcAmount : 5000
  const capitalAgents = useMemo<AgentCapital[]>(() => {
    const defensiveShift = regime === 'RISK-OFF' ? 8 : 0
    const betShift = regime === 'RISK-ON' ? 5 : -3

    return [
      {
        id: 'portfolio',
        name: 'PortfolioAgent',
        shortName: 'Portfolio',
        color: '#67e8f9',
        allocation: 42 + defensiveShift,
        opportunityScore: regime === 'RISK-OFF' ? 91 : 74,
        status: regime === 'RISK-OFF' ? 'Defense leading' : 'Baseline guard',
      },
      {
        id: 'market',
        name: 'MarketAgent',
        shortName: 'Market',
        color: '#4ade80',
        allocation: 31 - Math.floor(defensiveShift / 2),
        opportunityScore: 82,
        status: '3 markets active',
      },
      {
        id: 'bet',
        name: 'BetAgent',
        shortName: 'Bet',
        color: '#60a5fa',
        allocation: 27 + betShift - Math.ceil(defensiveShift / 2),
        opportunityScore: regime === 'RISK-ON' ? 88 : 69,
        status: regime === 'RISK-ON' ? '+EV leading' : 'Kelly capped',
      },
    ]
  }, [regime])

  const topAgent = capitalAgents.reduce((best, agent) =>
    agent.opportunityScore > best.opportunityScore ? agent : best,
  capitalAgents[0])
  const countdownMinutes = Math.floor(rebalanceCountdown / 60)
  const countdownSeconds = String(rebalanceCountdown % 60).padStart(2, '0')
  const activeCapitalEvent = CAPITAL_EVENTS[flowStep % CAPITAL_EVENTS.length]
  const regimeSwitches = regimeMemory.length
  const correctSwitches = regimeMemory.filter((event) => event.hindsight === 'Correct').length
  const resolvedSwitches = regimeMemory.filter((event) => event.hindsight !== 'Pending').length
  const accuracy = resolvedSwitches > 0 ? Math.round((correctSwitches / resolvedSwitches) * 100) : 0

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRebalanceCountdown((current) => (current > 0 ? current - 1 : 300))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlowStep((current) => current + 1)
    }, 3200)

    return () => window.clearInterval(timer)
  }, [])

  const runAgent = async () => {
    if (!isConnected) return

    setLoading(true)
    setRegime('ANALYZING')
    setLog([])

    try {
      const res = await fetch('/api/portfolio-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio, address }),
      })
      const data = await res.json()
      const nextRegime = data.regime === 'RISK-ON' || data.regime === 'RISK-OFF' ? data.regime : 'ANALYZING'
      const previousRegime = regime === 'RISK-ON' || regime === 'RISK-OFF' ? regime : nextRegime === 'RISK-ON' ? 'RISK-OFF' : 'RISK-ON'
      const nextReasoning = Array.isArray(data.reasoning) ? data.reasoning : ['Agent returned an unreadable response.']

      setRegime(nextRegime)
      setUsycAlloc(typeof data.usycAllocation === 'number' ? clampAllocation(data.usycAllocation) : 0)
      setLog(nextReasoning)
      if (nextRegime === 'RISK-ON' || nextRegime === 'RISK-OFF') {
        const now = new Date()
        setRegimeMemory((current) => [
          {
            id: `run-${now.getTime()}`,
            day: 'Live',
            time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            from: previousRegime,
            to: nextRegime,
            reason: nextReasoning[0] ?? 'PortfolioAgent changed regime after the latest balance and macro scan.',
            hindsight: 'Pending',
            evidence: 'Queued for hindsight scoring after realized market data arrives.',
          },
          ...current,
        ])
      }
    } catch {
      setRegime('RISK-OFF')
      setUsycAlloc(30)
      setLog(['Error running agent. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  const regimeClass = regime === 'RISK-ON' ? 'regime-on' : regime === 'RISK-OFF' ? 'regime-off' : 'regime-analyzing'
  const regimeLabel = regime === 'READY' ? 'READY TO RUN' : regime
  const allocation = clampAllocation(usycAlloc)
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="nav-tabs page-anim page-anim-1">
          <Link href="/portfolio" className="nav-tab active">Portfolio</Link>
          <Link href="/markets" className="nav-tab">Markets</Link>
          <Link href="/bets" className="nav-tab">Bets</Link>
        </div>

        <div className="page-heading page-anim page-anim-2">
          <div className="page-tag">RFB 4 · PortfolioAgent</div>
          <h1 className="page-title">Adaptive Portfolio Manager</h1>
          <p className="page-sub">AI monitors your Arc testnet balances, detects market regime, and recommends USYC allocation.</p>
        </div>

        {!isConnected ? (
          <div className="card connect-prompt page-anim page-anim-3">
            <h3>Connect your wallet to continue</h3>
            <p>PortfolioAgent will analyze your real USDC, EURC and USYC balances on Arc testnet.</p>
          </div>
        ) : (
          <>
            <div className="grid-2">
              <div className="card page-anim page-anim-3">
                <div className="card-title">Market Regime</div>
                <div className={`regime-badge ${regimeClass}`}>
                  <span className="regime-dot"></span>
                  {regimeLabel}
                </div>

                <div className="allocation-section">
                  <div className="card-title">USYC Allocation</div>
                  <div className="stat-num">{allocation}%</div>
                  <progress className="usyc-progress" value={allocation} max={100} aria-label="USYC allocation" />
                  <div className="stat-label">of idle USDC earning yield</div>
                </div>
              </div>

              <div className="card page-anim page-anim-4">
                <div className="card-title">Arc Testnet Balances</div>
                <div className="wallet-address">{shortAddress}</div>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((position) => (
                      <tr key={position.asset}>
                        <td className="portfolio-asset-cell">{position.asset}</td>
                        <td className="portfolio-amount-cell">{position.amount}</td>
                        <td className="portfolio-value-cell">{position.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="portfolio-feature-grid page-anim page-anim-5">
              <section className="card portfolio-feature-card">
                <div className="feature-heading">
                  <div>
                    <div className="card-title">Regime Memory Timeline</div>
                    <h2 className="feature-title">Every AI regime switch, with reasoning and hindsight.</h2>
                  </div>
                  <div className="memory-scoreboard" aria-label="Regime memory summary">
                    <div>
                      <span>{regimeSwitches}</span>
                      <small>7d switches</small>
                    </div>
                    <div>
                      <span>{accuracy}%</span>
                      <small>hindsight hit rate</small>
                    </div>
                  </div>
                </div>

                <div className="timeline-list">
                  {regimeMemory.map((event) => (
                    <article className="timeline-event" key={event.id}>
                      <div className="timeline-rail">
                        <span className={`timeline-dot ${event.to === 'RISK-ON' ? 'timeline-dot-on' : 'timeline-dot-off'}`}></span>
                      </div>
                      <div className="timeline-body">
                        <div className="timeline-meta">
                          <span>{event.day} · {event.time}</span>
                          <span className={`hindsight-badge ${getHindsightClass(event.hindsight)}`}>
                            {getHindsightIcon(event.hindsight)}
                            {event.hindsight}
                          </span>
                        </div>
                        <div className="timeline-switch">
                          <span>{event.from}</span>
                          <ArrowRightLeft size={14} aria-hidden="true" />
                          <span>{event.to}</span>
                        </div>
                        <p className="timeline-reason">{event.reason}</p>
                        <p className="timeline-evidence">{event.evidence}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card portfolio-feature-card capital-flow-card">
                <div className="feature-heading">
                  <div>
                    <div className="card-title">Cross-Agent Capital Flow</div>
                    <h2 className="feature-title">Shared USDC moves to the agent with the best score.</h2>
                  </div>
                  <div className="rebalance-clock" aria-label="Countdown to next rebalance">
                    <Timer size={16} aria-hidden="true" />
                    {countdownMinutes}:{countdownSeconds}
                  </div>
                </div>

                <div className="capital-flow-canvas" aria-label="Capital allocation by agent">
                  <div className="flow-core">
                    <span>Master AI</span>
                    <strong>{topAgent.shortName}</strong>
                    <small>top score {topAgent.opportunityScore}</small>
                  </div>

                  <div className="agent-node agent-node-portfolio">
                    <Activity size={16} aria-hidden="true" />
                    <span>PortfolioAgent</span>
                  </div>
                  <div className="agent-node agent-node-market">
                    <Activity size={16} aria-hidden="true" />
                    <span>MarketAgent</span>
                  </div>
                  <div className="agent-node agent-node-bet">
                    <Activity size={16} aria-hidden="true" />
                    <span>BetAgent</span>
                  </div>

                  <span className="flow-line flow-line-portfolio"></span>
                  <span className="flow-line flow-line-market"></span>
                  <span className="flow-line flow-line-bet"></span>
                  <span className={`flow-pulse flow-pulse-${capitalAgents[flowStep % capitalAgents.length].id}`}></span>
                </div>

                <div className="active-transfer">
                  <span>{activeCapitalEvent.amount}</span>
                  <div>
                    <strong>{activeCapitalEvent.from} → {activeCapitalEvent.to}</strong>
                    <small>{activeCapitalEvent.reason}</small>
                  </div>
                </div>

                <div className="agent-capital-list">
                  {capitalAgents.map((agent) => {
                    const capital = totalUsdc * (agent.allocation / 100)

                    return (
                      <div className="agent-capital-row" key={agent.id}>
                        <div className="agent-capital-main">
                          <span className="agent-capital-dot" style={{ background: agent.color }}></span>
                          <div>
                            <strong>{agent.name}</strong>
                            <small>{agent.status}</small>
                          </div>
                        </div>
                        <div className="agent-capital-metrics">
                          <span>{formatUsd(capital)}</span>
                          <small>score {agent.opportunityScore}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="allocator-decision">
                  <span>Allocation decision</span>
                  <strong>Hold {topAgent.name} overweight until the next rebalance cycle.</strong>
                </div>
              </section>
            </div>

            <div className="card page-anim page-anim-5">
              <div className="card-title">Agent Decision Log</div>
              <div className="log-box">
                {log.length === 0 ? (
                  <div className="log-line log-empty">Run the agent to see decisions...</div>
                ) : (
                  log.map((line, index) => <div key={`${line}-${index}`} className="log-line">{line}</div>)
                )}
              </div>
              <button className="run-btn" onClick={runAgent} disabled={loading}>
                <RefreshCw size={16} aria-hidden="true" />
                {loading ? 'Agent thinking...' : 'Run PortfolioAgent'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
