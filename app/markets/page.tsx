'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, CircleDollarSign, Plus, RefreshCw, Send } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { formatUnits, parseEventLogs, parseUnits, zeroAddress, type Log } from 'viem'
import { useAccount, usePublicClient, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from 'wagmi'
import {
  ARC_TESTNET_CHAIN_ID,
  ERC20_APPROVE_ABI,
  ERC20_BALANCE_OF_ABI,
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from '@/lib/prediction-market'
import {
  applyMarketOverride,
  getEffectiveResolutionDeadline,
  getResolverUnlockDeadline,
  type MarketOverrideMetadata,
  type MarketOverrides,
} from '@/lib/market-overrides'

type MarketSide = 'YES' | 'NO'
type ScanState = 'READY' | 'SCANNING' | 'COMPLETE' | 'ERROR'
type BetStep = 'idle' | 'approving' | 'betting' | 'confirmed'

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
} & MarketOverrideMetadata

type MarketDraft = {
  id: string
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: number
  category: string
  triggeredByNews: string
}

type MarketInput = Omit<MarketDraft, 'id'>

type MarketFormState = {
  title: string
  description: string
  resolutionCriteria: string
  deadline: string
  initialLiquidity: string
  aiProbability: string
  category: string
  triggeredByNews: string
}

type BetModalState = {
  market: ContractMarket
  side: MarketSide
  amount: string
}

type UserPosition = {
  yesAmount: bigint
  noAmount: bigint
  claimed: boolean
  payout: bigint
}

const emptyForm: MarketFormState = {
  title: '',
  description: '',
  resolutionCriteria: '',
  deadline: '',
  initialLiquidity: '',
  aiProbability: '',
  category: '',
  triggeredByNews: '',
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const cleanText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const parseAiProbability = (value: unknown) => {
  const parsed = parseNumber(value)
  if (parsed === null) return null
  const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed
  return round(clamp(percent, 0, 100), 1)
}

const parseUsdcAmount = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '').trim()
  if (!cleaned) return 0n

  try {
    return parseUnits(cleaned, USDC_DECIMALS)
  } catch {
    return 0n
  }
}

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

const truncateUsdcAmount = (value: bigint, decimals = 2) => {
  const formatted = formatUnits(value, USDC_DECIMALS)
  const [whole, fraction = ''] = formatted.split('.')
  return `${whole}.${fraction.padEnd(decimals, '0').slice(0, decimals)}`
}

const formatPercent = (value: number) => `${round(value, 1).toFixed(1)}%`

const formatDeadline = (deadline: bigint) => {
  if (deadline === 0n) return 'No deadline'
  return new Date(Number(deadline) * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDeadlineDateTime = (deadline: bigint) => {
  if (deadline === 0n) return 'No deadline'
  return new Date(Number(deadline) * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const parseDeadlineTimestamp = (deadline: string) => {
  if (!deadline) return 0n
  const timestamp = Math.floor(new Date(`${deadline}T23:59:59Z`).getTime() / 1000)
  return Number.isFinite(timestamp) && timestamp > 0 ? BigInt(timestamp) : 0n
}

const fetchMarketOverrides = async (): Promise<MarketOverrides> => {
  const response = await fetch('/api/market-overrides', { cache: 'no-store' })
  if (!response.ok) return {}

  const data = await response.json() as { overrides?: MarketOverrides }
  return data.overrides ?? {}
}

const currentUnixSeconds = () => Math.floor(Date.now() / 1000)

const getBetLockDeadline = (market: ContractMarket) => {
  const effectiveDeadline = getEffectiveResolutionDeadline(market)
  return effectiveDeadline < market.deadline ? effectiveDeadline : market.deadline
}

const toBigIntValue = (value: unknown) => (typeof value === 'bigint' ? value : 0n)

const toNumberValue = (value: unknown) => {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return 0
}

const normalizeUserPosition = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 3) {
    return { yesAmount: 0n, noAmount: 0n, claimed: false }
  }

  return {
    yesAmount: toBigIntValue(value[0]),
    noAmount: toBigIntValue(value[1]),
    claimed: Boolean(value[2]),
  }
}

const normalizeContractMarket = (marketId: bigint, value: unknown): ContractMarket | null => {
  if (!Array.isArray(value) || value.length < 14) return null

  const title = cleanText(value[1])
  if (!title) return null

  return {
    id: marketId,
    marketId: marketId.toString(),
    creator: cleanText(value[0]),
    title,
    description: cleanText(value[2]),
    resolutionCriteria: cleanText(value[3]),
    deadline: toBigIntValue(value[4]),
    aiProbability: clamp(toNumberValue(value[5]), 0, 100),
    category: cleanText(value[6]),
    triggeredByNews: cleanText(value[7]),
    totalYes: toBigIntValue(value[8]),
    totalNo: toBigIntValue(value[9]),
    liquidity: toBigIntValue(value[10]),
    pool: toBigIntValue(value[11]),
    outcome: toNumberValue(value[12]),
    resolved: Boolean(value[13]),
  }
}

const normalizeMarketDraft = (value: unknown): MarketDraft | null => {
  if (typeof value !== 'object' || value === null) return null

  const item = value as Record<string, unknown>
  const title = cleanText(item.title)
  const description = cleanText(item.description)
  const resolutionCriteria = cleanText(item.resolutionCriteria)
  const deadline = cleanText(item.deadline)
  const initialLiquidity = cleanText(item.initialLiquidity)
  const aiProbability = parseAiProbability(item.aiProbability)
  const category = cleanText(item.category)
  const triggeredByNews = cleanText(item.triggeredByNews)

  if (!title || !description || !resolutionCriteria || !deadline || !initialLiquidity || aiProbability === null || !category || !triggeredByNews) {
    return null
  }

  return {
    id: `${title}-${deadline}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    description,
    resolutionCriteria,
    deadline,
    initialLiquidity,
    aiProbability,
    category,
    triggeredByNews,
  }
}

const getCrowdOdds = (market: ContractMarket) => {
  const volume = market.totalYes + market.totalNo
  if (volume === 0n) return null
  return Number((market.totalYes * 10_000n) / volume) / 100
}

const getBetDecimalOdds = (market: ContractMarket, side: MarketSide) => {
  const crowdOdds = getCrowdOdds(market)
  if (crowdOdds === null) return null

  const impliedProbability = side === 'YES' ? crowdOdds : 100 - crowdOdds
  if (impliedProbability <= 0) return null
  return 100 / impliedProbability
}

const quotePotentialPayout = (market: ContractMarket, side: MarketSide, amount: bigint) => {
  if (amount <= 0n) return 0n

  const sideTotal = side === 'YES' ? market.totalYes : market.totalNo
  const totalSideBets = sideTotal + amount
  if (totalSideBets === 0n) return 0n

  const opposingSideBets = side === 'YES' ? market.totalNo : market.totalYes
  return amount + ((amount * opposingSideBets) / totalSideBets)
}

const buildMarketInput = (value: MarketDraft | MarketInput): MarketInput => ({
  title: value.title,
  description: value.description,
  resolutionCriteria: value.resolutionCriteria,
  deadline: value.deadline,
  initialLiquidity: value.initialLiquidity,
  aiProbability: value.aiProbability,
  category: value.category,
  triggeredByNews: value.triggeredByNews,
})

export default function MarketsPage() {
  const { address, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const { writeContractAsync, isPending } = useWriteContract()
  const approveWrite = useWriteContract()

  const [loading, setLoading] = useState(false)
  const [scanState, setScanState] = useState<ScanState>('READY')
  const [form, setForm] = useState<MarketFormState>(emptyForm)
  const [agentLog, setAgentLog] = useState<string[]>(['MarketAgent is idle.'])
  const [drafts, setDrafts] = useState<MarketDraft[]>([])
  const [creatingDraftId, setCreatingDraftId] = useState<string | null>(null)
  const [betModal, setBetModal] = useState<BetModalState | null>(null)
  const [resolvingMarketId, setResolvingMarketId] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [txSuccess, setTxSuccess] = useState<string | null>(null)
  const [betStep, setBetStep] = useState<BetStep>('idle')
  const [approvalHash, setApprovalHash] = useState<string | null>(null)
  const [betHash, setBetHash] = useState<string | null>(null)
  const [nowSeconds, setNowSeconds] = useState(currentUnixSeconds)
  const [marketOverrides, setMarketOverrides] = useState<MarketOverrides>({})

  useEffect(() => {
    const timer = window.setInterval(() => setNowSeconds(currentUnixSeconds()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchMarketOverrides()
      .then((overrides) => {
        if (!cancelled) setMarketOverrides(overrides)
      })
      .catch(() => {
        if (!cancelled) setMarketOverrides({})
      })

    return () => {
      cancelled = true
    }
  }, [])

  const {
    data: marketCountData,
    isLoading: marketCountLoading,
    refetch: refetchMarketCount,
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
    refetch: refetchMarkets,
  } = useReadContracts({
    contracts: marketReadContracts,
    query: { enabled: marketReadContracts.length > 0 },
  })

  const markets = useMemo(() => (marketResults ?? [])
    .map((result, index) => (result.status === 'success'
      ? normalizeContractMarket(marketIds[index], result.result)
      : null))
    .filter((market): market is ContractMarket => market !== null)
    .map((market) => applyMarketOverride(market, marketOverrides)),
  [marketIds, marketOverrides, marketResults])

  const positionReadContracts = useMemo(() => address ? markets.map((market) => ({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getPosition',
    args: [market.id, address],
    chainId: ARC_TESTNET_CHAIN_ID,
  } as const)) : [], [address, markets])

  const {
    data: positionResults,
    refetch: refetchPositions,
  } = useReadContracts({
    contracts: positionReadContracts,
    query: { enabled: positionReadContracts.length > 0 },
  })

  const payoutQuoteReadContracts = useMemo(() => address ? markets.map((market) => ({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'quotePayout',
    args: [market.id, address],
    chainId: ARC_TESTNET_CHAIN_ID,
  } as const)) : [], [address, markets])

  const {
    data: payoutQuoteResults,
    refetch: refetchPayoutQuotes,
  } = useReadContracts({
    contracts: payoutQuoteReadContracts,
    query: { enabled: payoutQuoteReadContracts.length > 0 },
  })

  const {
    data: walletUsdcBalance,
    isLoading: walletUsdcBalanceLoading,
    refetch: refetchWalletUsdcBalance,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  const userPositions = useMemo(() => {
    const nextPositions = new Map<string, UserPosition>()

    markets.forEach((market, index) => {
      const positionResult = positionResults?.[index]
      const payoutResult = payoutQuoteResults?.[index]
      const position = positionResult?.status === 'success'
        ? normalizeUserPosition(positionResult.result)
        : { yesAmount: 0n, noAmount: 0n, claimed: false }
      const payout = payoutResult?.status === 'success' && typeof payoutResult.result === 'bigint'
        ? payoutResult.result
        : 0n

      nextPositions.set(market.marketId, { ...position, payout })
    })

    return nextPositions
  }, [markets, payoutQuoteResults, positionResults])

  const totalPool = useMemo(() => markets.reduce((sum, market) => sum + market.pool, 0n), [markets])
  const highAlphaCount = useMemo(() => markets.filter((market) => {
    const crowdOdds = getCrowdOdds(market)
    return crowdOdds !== null && Math.abs(market.aiProbability - crowdOdds) > 15
  }).length, [markets])

  const selectedBetMarket = useMemo(() => {
    if (!betModal) return null
    return markets.find((market) => market.marketId === betModal.market.marketId) ?? betModal.market
  }, [betModal, markets])

  const betAmountUnits = useMemo(() => (betModal ? parseUsdcAmount(betModal.amount) : 0n), [betModal])
  const walletUsdcBalanceReady = typeof walletUsdcBalance === 'bigint'
  const availableBetBalance = walletUsdcBalanceReady ? walletUsdcBalance : 0n
  const betExceedsBalance = walletUsdcBalanceReady && betAmountUnits > 0n && betAmountUnits > availableBetBalance
  const walletBalanceLabel = walletUsdcBalanceLoading
    ? 'Loading balance...'
    : walletUsdcBalanceReady
      ? `${truncateUsdcAmount(availableBetBalance, USDC_DECIMALS)} USDC available`
      : 'Balance unavailable'
  const selectedCrowdOdds = selectedBetMarket ? getCrowdOdds(selectedBetMarket) : null
  const selectedBetImpliedOdds = selectedCrowdOdds !== null && betModal
    ? betModal.side === 'YES' ? selectedCrowdOdds : 100 - selectedCrowdOdds
    : null
  const selectedDecimalOdds = selectedBetMarket && betModal ? getBetDecimalOdds(selectedBetMarket, betModal.side) : null
  const transactionPending = loading || isPending || approveWrite.isPending
  const canSubmitBet = !transactionPending && betStep !== 'confirmed' && walletUsdcBalanceReady && !betExceedsBalance && betAmountUnits > 0n
  const isReadingMarkets = marketCountLoading || marketsLoading
  const scanLabel = scanState === 'READY' ? 'READY TO SCAN' : scanState === 'COMPLETE' ? 'SCAN COMPLETE' : scanState
  const scanClass = scanState === 'ERROR' ? 'regime-off' : scanState === 'COMPLETE' ? 'regime-on' : 'regime-analyzing'

  const ensureArcChain = async () => {
    await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID })
  }

  const refreshContractMarkets = async () => {
    await refetchMarketCount()
    await refetchMarkets()
    if (positionReadContracts.length > 0) await refetchPositions()
    if (payoutQuoteReadContracts.length > 0) await refetchPayoutQuotes()
    if (address) await refetchWalletUsdcBalance()
  }

  const parseMarketCreatedId = (receiptLogs: Log[]) => {
    const parsedLogs = parseEventLogs({
      abi: PREDICTION_MARKET_ABI,
      eventName: 'MarketCreated',
      logs: receiptLogs,
    })

    const marketId = (parsedLogs[0] as { args?: { marketId?: bigint } } | undefined)?.args?.marketId
    if (typeof marketId !== 'bigint') {
      throw new Error('PredictionMarket did not emit MarketCreated.')
    }

    return marketId
  }

  const approveUsdcSpend = async (requiredAmount: bigint) => {
    if (!address) throw new Error('Connect your wallet first.')
    if (requiredAmount <= 0n) throw new Error('Enter a valid USDC amount.')
    if (!publicClient) throw new Error('Public client unavailable.')

    const hash = await approveWrite.writeContractAsync({
      address: USDC_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [PREDICTION_MARKET_ADDRESS, requiredAmount],
      chainId: ARC_TESTNET_CHAIN_ID,
    })

    await publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  const createMarketOnChain = async (input: MarketInput) => {
    const liquidity = parseUsdcAmount(input.initialLiquidity)
    if (liquidity <= 0n) throw new Error(`Invalid initial liquidity for "${input.title}".`)

    const deadline = parseDeadlineTimestamp(input.deadline)
    if (deadline <= BigInt(currentUnixSeconds())) {
      throw new Error('Choose a future deadline.')
    }

    if (!publicClient) throw new Error('Public client unavailable.')

    await ensureArcChain()
    await approveUsdcSpend(liquidity)

    const hash = await writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'createMarket',
      args: [
        input.title,
        input.description,
        input.resolutionCriteria,
        deadline,
        liquidity,
        BigInt(Math.round(input.aiProbability)),
        input.category,
        input.triggeredByNews,
      ],
      chainId: ARC_TESTNET_CHAIN_ID,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    const marketId = parseMarketCreatedId(receipt.logs as Log[])
    await refreshContractMarkets()
    return { marketId, hash }
  }

  const runMarketAgent = async () => {
    if (!isConnected) {
      setTxError('Connect a wallet before creating on-chain markets.')
      return
    }

    setLoading(true)
    setScanState('SCANNING')
    setTxError(null)
    setTxSuccess(null)
    setAgentLog(['MarketAgent is requesting live market ideas.'])

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
      const drafts = Array.isArray(data)
        ? data.map(normalizeMarketDraft).filter((draft): draft is MarketDraft => draft !== null)
        : []

      if (drafts.length === 0) {
        throw new Error('MarketAgent did not return usable market drafts.')
      }

      setDrafts(drafts)
      setScanState('COMPLETE')
      setAgentLog([
        `MarketAgent returned ${drafts.length} market drafts.`,
        'Create each draft onchain one by one.',
      ])
    } catch (error) {
      setScanState('ERROR')
      setAgentLog([
        error instanceof Error ? error.message : 'MarketAgent request failed.',
        'No market drafts were returned.',
      ])
    } finally {
      setLoading(false)
    }
  }

  const createDraftOnChain = async (draft: MarketDraft) => {
    try {
      setCreatingDraftId(draft.id)
      setTxError(null)
      setTxSuccess(null)
      const created = await createMarketOnChain(buildMarketInput(draft))

      setDrafts((current) => current.filter((item) => item.id !== draft.id))
      setTxSuccess(`Market created on chain as #${created.marketId.toString()}.`)
      setAgentLog((current) => [
        `Created contract market #${created.marketId.toString()} from MarketAgent draft.`,
        ...current.slice(0, 3),
      ])
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Failed to create market draft.')
    } finally {
      setCreatingDraftId(null)
    }
  }

  const handleManualCreate = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.resolutionCriteria.trim() || !form.deadline.trim() || !form.initialLiquidity.trim() || !form.aiProbability.trim() || !form.category.trim() || !form.triggeredByNews.trim()) {
      return
    }

    if (!isConnected || !address) {
      setTxError('Connect a wallet before creating an on-chain market.')
      return
    }

    const aiProbability = parseAiProbability(form.aiProbability)
    if (aiProbability === null) {
      setTxError('Enter a valid AI probability.')
      return
    }

    try {
      setLoading(true)
      setTxError(null)
      setTxSuccess(null)

      const created = await createMarketOnChain({
        title: form.title,
        description: form.description,
        resolutionCriteria: form.resolutionCriteria,
        deadline: form.deadline,
        initialLiquidity: form.initialLiquidity,
        aiProbability,
        category: form.category,
        triggeredByNews: form.triggeredByNews,
      })

      setForm(emptyForm)
      setTxSuccess(`Market created on chain as #${created.marketId.toString()}.`)
      setAgentLog((current) => [
        `Created contract market #${created.marketId.toString()} from manual input.`,
        ...current.slice(0, 3),
      ])
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Failed to create market.')
    } finally {
      setLoading(false)
    }
  }

  const closeBetModal = () => {
    if (transactionPending) return
    setBetModal(null)
    setTxError(null)
    setTxSuccess(null)
    setBetStep('idle')
    setApprovalHash(null)
    setBetHash(null)
  }

  const handleBet = (market: ContractMarket, side: MarketSide) => {
    if (getBetLockDeadline(market) <= BigInt(currentUnixSeconds())) {
      setTxError('This market is closed for betting.')
      return
    }

    setTxError(null)
    setTxSuccess(null)
    setBetStep('idle')
    setApprovalHash(null)
    setBetHash(null)
    setBetModal({
      market,
      side,
      amount: '',
    })
  }

  const submitBet = async () => {
    if (!betModal || !selectedBetMarket || !address) return

    const amount = betAmountUnits
    if (amount <= 0n) {
      setTxError('Enter a valid USDC amount.')
      return
    }

    if (!walletUsdcBalanceReady) {
      setTxError('USDC balance is still loading. Try again in a moment.')
      return
    }

    if (amount > availableBetBalance) {
      setTxError(`Insufficient USDC balance. Available: ${formatUsdcAmount(availableBetBalance)}.`)
      return
    }

    try {
      setLoading(true)
      setTxError(null)
      setTxSuccess(null)
      setBetStep('approving')
      setApprovalHash(null)
      setBetHash(null)

      await ensureArcChain()
      const approvalTx = await approveUsdcSpend(amount)
      setApprovalHash(approvalTx)

      setBetStep('betting')
      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: betModal.side === 'YES' ? 'betYes' : 'betNo',
        args: [selectedBetMarket.id, amount],
        chainId: ARC_TESTNET_CHAIN_ID,
      })

      if (!publicClient) {
        throw new Error('Public client unavailable.')
      }

      await publicClient.waitForTransactionReceipt({ hash })
      await refreshContractMarkets()

      setBetHash(hash)
      setBetStep('confirmed')
      setTxSuccess(`Bet confirmed. Transaction: ${hash}`)
      setAgentLog((current) => [
        `Confirmed ${betModal.side} bet on contract market #${selectedBetMarket.marketId}.`,
        ...current.slice(0, 3),
      ])
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Failed to submit bet.')
    } finally {
      setLoading(false)
    }
  }

  const requestAiResolution = async (market: ContractMarket) => {
    const resolverUnlockDeadline = getResolverUnlockDeadline(market)

    if (resolverUnlockDeadline > 0n && resolverUnlockDeadline > BigInt(currentUnixSeconds())) {
      setTxError(`AI resolution unlocks after ${formatDeadlineDateTime(resolverUnlockDeadline)}.`)
      return
    }

    try {
      setResolvingMarketId(market.marketId)
      setTxError(null)
      setTxSuccess(null)

      const response = await fetch('/api/resolve-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: market.marketId }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI Resolver could not resolve this market.')
      }

      await refreshContractMarkets()
      setTxSuccess(`AI resolved market #${market.marketId} as ${data.outcome}. Transaction: ${data.txHash}`)
      setAgentLog((current) => [
        `AI Resolver settled contract market #${market.marketId} as ${data.outcome}.`,
        typeof data.reasoning === 'string' ? data.reasoning : 'Resolution submitted by the authorized AI resolver wallet.',
        ...current.slice(0, 3),
      ])
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'AI Resolver failed to settle market.')
    } finally {
      setResolvingMarketId(null)
    }
  }

  const claimPayoutOnChain = async (market: ContractMarket) => {
    if (!address) {
      setTxError('Connect your wallet before claiming payout.')
      return
    }

    if (!publicClient) {
      setTxError('Public client unavailable.')
      return
    }

    try {
      setLoading(true)
      setTxError(null)
      setTxSuccess(null)
      await ensureArcChain()

      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimPayout',
        args: [market.id],
        chainId: ARC_TESTNET_CHAIN_ID,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await refreshContractMarkets()
      setTxSuccess(`Payout claimed for market #${market.marketId}. Transaction: ${hash}`)
      setAgentLog((current) => [
        `Claimed payout from contract market #${market.marketId}.`,
        ...current.slice(0, 3),
      ])
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Failed to claim payout.')
    } finally {
      setLoading(false)
    }
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
          <p className="page-sub">Markets, pools, crowd odds, deadlines, and bet execution are read from the deployed PredictionMarket contract.</p>
        </div>

        {!isConnected ? (
          <div className="card connect-prompt page-anim page-anim-3">
            <h3>Connect your wallet to continue</h3>
            <p>MarketAgent needs your wallet before it can create markets or send USDC bets.</p>
          </div>
        ) : (
          <>
            <section className="market-section page-anim page-anim-3">
              <div className="market-section-header">
                <div>
                  <div className="card-title">Contract Markets</div>
                  <h2 className="feature-title">AI probability versus crowd implied odds.</h2>
                </div>
                <div className="market-summary-strip" aria-label="Contract market summary">
                  <div>
                    <span>{markets.length}</span>
                    <small>markets</small>
                  </div>
                  <div>
                    <span>{formatUsdcAmount(totalPool)}</span>
                    <small>pool</small>
                  </div>
                  <div>
                    <span>{highAlphaCount}</span>
                    <small>high alpha</small>
                  </div>
                </div>
              </div>

              {isReadingMarkets ? (
                <div className="empty-market-state">
                  <p>Loading contract markets...</p>
                </div>
              ) : markets.length === 0 ? (
                <div className="empty-market-state">
                  <p>No markets yet. Run MarketAgent to create the first market.</p>
                </div>
              ) : (
                <div className="active-market-grid">
                  {markets.map((market) => {
                    const crowdOdds = getCrowdOdds(market)
                    const disagreement = crowdOdds === null ? null : Math.abs(market.aiProbability - crowdOdds)
                    const highAlpha = disagreement !== null && disagreement > 15
                    const userPosition = userPositions.get(market.marketId)
                    const hasUserPosition = !!userPosition && (userPosition.yesAmount > 0n || userPosition.noAmount > 0n)
                    const isCreator = !!address && market.creator.toLowerCase() === address.toLowerCase()
                    const effectiveDeadline = getEffectiveResolutionDeadline(market)
                    const betLockDeadline = getBetLockDeadline(market)
                    const resolverUnlockDeadline = getResolverUnlockDeadline(market)
                    const isClosed = betLockDeadline > 0n && betLockDeadline <= BigInt(nowSeconds)
                    const canResolve = resolverUnlockDeadline > 0n && resolverUnlockDeadline <= BigInt(nowSeconds)
                    const canClaim = !!userPosition && market.resolved && !userPosition.claimed && userPosition.payout > 0n

                    return (
                      <article className="active-market-card" key={market.marketId}>
                        <div className="active-market-top">
                          <span className="category-badge">{market.category || `Contract #${market.marketId}`}</span>
                          {market.resolved ? <span className="spawn-badge">RESOLVED</span> : null}
                          {market.hasOffchainOverride ? <span className="spawn-badge">CORRECTED</span> : null}
                          {!market.resolved && isClosed ? <span className="spawn-badge">CLOSED</span> : null}
                          {highAlpha ? <span className="alpha-badge">HIGH ALPHA</span> : null}
                        </div>

                        <h3>{market.title}</h3>
                        <p>{market.description}</p>

                        <div className="market-card-meta">
                          <div>
                            <span>Deadline</span>
                            <strong>{formatDeadline(effectiveDeadline)}</strong>
                          </div>
                          <div>
                            <span>Pool</span>
                            <strong>{formatUsdcAmount(market.pool)}</strong>
                          </div>
                        </div>

                        <div className="market-card-meta">
                          <div>
                            <span>YES bets</span>
                            <strong>{formatUsdcAmount(market.totalYes)}</strong>
                          </div>
                          <div>
                            <span>NO bets</span>
                            <strong>{formatUsdcAmount(market.totalNo)}</strong>
                          </div>
                        </div>

                        {hasUserPosition ? (
                          <div className="market-card-meta">
                            <div>
                              <span>Your YES</span>
                              <strong>{formatUsdcAmount(userPosition.yesAmount)}</strong>
                            </div>
                            <div>
                              <span>Your NO</span>
                              <strong>{formatUsdcAmount(userPosition.noAmount)}</strong>
                            </div>
                          </div>
                        ) : null}

                        {canClaim ? (
                          <div className="market-card-meta">
                            <div>
                              <span>Claimable</span>
                              <strong>{formatUsdcAmount(userPosition.payout)}</strong>
                            </div>
                            <div>
                              <span>Outcome</span>
                              <strong>{market.outcome === 1 ? 'YES' : 'NO'}</strong>
                            </div>
                          </div>
                        ) : null}

                        <div className="probability-grid">
                          <div>
                            <span>AI</span>
                            <strong>{formatPercent(market.aiProbability)}</strong>
                          </div>
                          <div>
                            <span>Crowd</span>
                            <div className="odds-line">
                              <strong>{crowdOdds === null ? 'No bets yet' : formatPercent(crowdOdds)}</strong>
                              {disagreement !== null && crowdOdds !== null ? (
                                <span className="edge-badge">
                                  {market.aiProbability >= crowdOdds ? '+' : '-'}{formatPercent(disagreement)} edge
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="market-criteria">{market.resolutionCriteria}</div>
                        <div className="market-criteria">{market.triggeredByNews}</div>
                        {market.hasOffchainOverride ? (
                          <div className="resolution-review-note">
                            <span>Off-chain correction</span>
                            <strong>{market.overrideNote || `Contract deadline remains ${formatDeadlineDateTime(market.deadline)}.`}</strong>
                          </div>
                        ) : null}

                        <div className="bet-actions">
                          <button className="bet-btn bet-yes" onClick={() => handleBet(market, 'YES')} disabled={market.resolved || isClosed || transactionPending}>
                            <CircleDollarSign size={15} aria-hidden="true" />
                            Bet YES
                          </button>
                          <button className="bet-btn bet-no" onClick={() => handleBet(market, 'NO')} disabled={market.resolved || isClosed || transactionPending}>
                            <CircleDollarSign size={15} aria-hidden="true" />
                            Bet NO
                          </button>
                        </div>

                        {isCreator && !market.resolved && !isClosed ? (
                          <div className="resolution-lock">
                            <span>AI resolution locked</span>
                            <strong>{resolverUnlockDeadline > 0n ? `Unlocks after ${formatDeadlineDateTime(resolverUnlockDeadline)}` : 'Set a deadline before AI resolution.'}</strong>
                          </div>
                        ) : null}

                        {!market.resolved && isClosed ? (
                          <>
                            <div className="resolution-review-note">
                              <span>AI settlement</span>
                              <strong>{canResolve ? 'The creator cannot choose the result. ResolverAgent checks evidence and signs from the authorized resolver wallet.' : `Resolver waits until ${formatDeadlineDateTime(resolverUnlockDeadline)}.`}</strong>
                            </div>
                            <div className="bet-actions">
                              <button className="simulate-btn" type="button" onClick={() => void requestAiResolution(market)} disabled={!canResolve || transactionPending || resolvingMarketId === market.marketId}>
                                <CheckCircle2 size={13} aria-hidden="true" />
                                {resolvingMarketId === market.marketId ? 'Resolving...' : 'Resolve with AI'}
                              </button>
                            </div>
                          </>
                        ) : null}

                        {canClaim ? (
                          <div className="bet-actions">
                            <button className="simulate-btn" type="button" onClick={() => void claimPayoutOnChain(market)} disabled={transactionPending}>
                              <CircleDollarSign size={13} aria-hidden="true" />
                              Claim payout
                            </button>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              )}
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
                    <span>{markets.length} contract markets</span>
                  </div>
                  <div>
                    <Send size={16} aria-hidden="true" />
                    <span>{formatUsdcAmount(totalPool)} pool</span>
                  </div>
                </div>
                <div className="log-box dashboard-log">
                  {agentLog.map((line) => (
                    <div className="log-line" key={line}>{line}</div>
                  ))}
                </div>
                <button className="run-btn" onClick={runMarketAgent} disabled={loading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {loading ? 'Running MarketAgent...' : 'Run MarketAgent'}
                </button>
              </section>

              <section className="card">
                <div className="card-title">MarketAgent Drafts</div>
                {drafts.length === 0 ? (
                  <div className="empty-market-state">
                    <p>Run MarketAgent to load AI-generated market ideas.</p>
                  </div>
                ) : (
                  <div className="market-list">
                    {drafts.map((draft) => {
                      const isCreating = creatingDraftId === draft.id
                      return (
                        <div className="market-row bet-opportunity-row" key={draft.id}>
                          <div>
                            <div className="market-kicker">
                              {draft.category}
                              <span className="decay-timer">{formatPercent(draft.aiProbability)} AI</span>
                            </div>
                            <div className="market-title">{draft.title}</div>
                            <div className="market-criteria">{draft.description}</div>
                            <div className="market-criteria">{draft.resolutionCriteria}</div>
                            <div className="market-criteria">{draft.triggeredByNews}</div>
                          </div>
                          <div className="market-score">
                            <span>{draft.deadline}</span>
                            <small>{draft.initialLiquidity}</small>
                            <button className="simulate-btn" type="button" onClick={() => void createDraftOnChain(draft)} disabled={isCreating}>
                              <CheckCircle2 size={13} aria-hidden="true" />
                              {isCreating ? 'Creating...' : 'Create onchain'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="dashboard-grid market-command-grid page-anim page-anim-5">
              <section className="card">
                <div className="card-title">Manual Create Market</div>
                <div className="market-form">
                  <label>
                    <span>Title</span>
                    <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Market title" />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Describe the market." rows={3} />
                  </label>
                  <label>
                    <span>Resolution Criteria</span>
                    <textarea value={form.resolutionCriteria} onChange={(e) => setForm((current) => ({ ...current, resolutionCriteria: e.target.value }))} placeholder="Define how it settles." rows={3} />
                  </label>
                  <div className="market-form-grid">
                    <label>
                      <span>Deadline</span>
                      <input type="date" value={form.deadline} onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))} />
                    </label>
                    <label>
                      <span>Initial Liquidity</span>
                      <input value={form.initialLiquidity} onChange={(e) => setForm((current) => ({ ...current, initialLiquidity: e.target.value }))} placeholder="USDC amount" inputMode="decimal" />
                    </label>
                  </div>
                  <div className="market-form-grid">
                    <label>
                      <span>AI Probability</span>
                      <input value={form.aiProbability} onChange={(e) => setForm((current) => ({ ...current, aiProbability: e.target.value }))} placeholder="0-100" inputMode="decimal" />
                    </label>
                    <label>
                      <span>Category</span>
                      <input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} placeholder="Macro, Rates, Energy..." />
                    </label>
                  </div>
                  <label>
                    <span>Triggered By News</span>
                    <textarea value={form.triggeredByNews} onChange={(e) => setForm((current) => ({ ...current, triggeredByNews: e.target.value }))} placeholder="Headline or event that spawned this market." rows={2} />
                  </label>
                  <button className="run-btn" onClick={handleManualCreate} disabled={loading}>
                    <Plus size={16} aria-hidden="true" />
                    Create Market
                  </button>
                </div>
                {txError ? <div className="modal-status error">{txError}</div> : null}
                {txSuccess ? <div className="modal-status success">{txSuccess}</div> : null}
              </section>
            </div>
          </>
        )}
      </div>

      {betModal && selectedBetMarket ? (
        <div className="modal-backdrop" role="presentation" onClick={closeBetModal}>
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Bet market dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="card-title">{betModal.side} bet</div>
                <h3>{selectedBetMarket.title}</h3>
              </div>
              <button type="button" className="modal-close" onClick={closeBetModal} disabled={transactionPending}>Close</button>
            </div>
            <div className="modal-meta">
              <div><span>Market</span><strong>#{selectedBetMarket.marketId}</strong></div>
              <div><span>Current odds</span><strong>{selectedBetImpliedOdds === null ? 'No bets yet' : formatPercent(selectedBetImpliedOdds)}</strong></div>
              <div><span>Decimal odds</span><strong>{selectedDecimalOdds === null ? 'n/a' : `${selectedDecimalOdds.toFixed(2)}x`}</strong></div>
              <div><span>Pool</span><strong>{formatUsdcAmount(selectedBetMarket.pool)}</strong></div>
            </div>
            <label className="market-form">
              <div className="amount-label-row">
                <span>USDC amount</span>
                <button
                  type="button"
                  className="balance-max-btn"
                  onClick={() => setBetModal((current) => current ? { ...current, amount: truncateUsdcAmount(availableBetBalance, USDC_DECIMALS) } : current)}
                  disabled={transactionPending || availableBetBalance <= 0n}
                >
                  Max
                </button>
              </div>
              <input
                value={betModal.amount}
                onChange={(event) => setBetModal((current) => current ? { ...current, amount: event.target.value } : current)}
                placeholder="0.00"
                inputMode="decimal"
                aria-describedby="wallet-usdc-balance"
              />
            </label>
            <div className={`wallet-balance-row ${betExceedsBalance ? 'balance-warning' : ''}`} id="wallet-usdc-balance">
              <span>Wallet balance</span>
              <strong>{walletBalanceLabel}</strong>
            </div>
            <div className="modal-payout">
              <span>Expected payout if win</span>
              <strong>{formatUsdcAmount(quotePotentialPayout(selectedBetMarket, betModal.side, betAmountUnits))}</strong>
            </div>
            <div className="modal-steps">
              <span className={betStep === 'approving' ? 'active' : approvalHash ? 'done' : undefined}>Approve USDC</span>
              <span className={betStep === 'betting' ? 'active' : betHash ? 'done' : undefined}>Submit {betModal.side}</span>
              <span className={betStep === 'confirmed' ? 'done' : undefined}>Confirmed</span>
            </div>
            {approvalHash ? (
              <div className="modal-hash">
                <span>Approval tx</span>
                <strong>{approvalHash}</strong>
              </div>
            ) : null}
            {betHash ? (
              <div className="modal-hash">
                <span>Bet tx</span>
                <strong>{betHash}</strong>
              </div>
            ) : null}
            {txError ? <div className="modal-status error">{txError}</div> : null}
            {txSuccess ? <div className="modal-status success">{txSuccess}</div> : null}
            <button type="button" className="run-btn" onClick={submitBet} disabled={!canSubmitBet}>
              {betStep === 'approving'
                ? 'Approving USDC...'
                : betStep === 'betting'
                  ? 'Submitting bet...'
                  : betStep === 'confirmed'
                    ? 'Bet Confirmed'
                    : walletUsdcBalanceLoading
                      ? 'Loading Balance...'
                    : !walletUsdcBalanceReady
                      ? 'Balance Unavailable'
                    : betExceedsBalance
                      ? 'Insufficient USDC Balance'
                    : 'Approve and Confirm Bet'}
            </button>
            <div className="modal-footnote">
              {`USDC approval lets ${PREDICTION_MARKET_ADDRESS} spend ${formatUsdcAmount(betAmountUnits)} before the ${betModal.side} bet is submitted.`}
            </div>
          </div>
        </div>
      ) : null}

    </>
  )
}
