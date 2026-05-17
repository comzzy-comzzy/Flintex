'use client'

import Link from 'next/link'
import { useState } from 'react'
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

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [regime, setRegime] = useState<Regime>('READY')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [usycAlloc, setUsycAlloc] = useState(0)

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

      setRegime(nextRegime)
      setUsycAlloc(typeof data.usycAllocation === 'number' ? clampAllocation(data.usycAllocation) : 0)
      setLog(Array.isArray(data.reasoning) ? data.reasoning : ['Agent returned an unreadable response.'])
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
                {loading ? 'Agent thinking...' : 'Run PortfolioAgent'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
