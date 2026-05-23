/* eslint-disable @typescript-eslint/no-require-imports */
const { ethers } = require('ethers')
const predictionMarketArtifact = require('../artifacts/contracts/PredictionMarket.sol/PredictionMarket.json')

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
const USDC_DECIMALS = 6
const ARC_TESTNET_CHAIN_ID = 5042002n

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

const market = {
  title: 'Will the U.S. 10-year Treasury yield close above 4.50% on May 29, 2026?',
  description: 'A binary rates market on whether the U.S. 10-year Treasury yield finishes above 4.50% on the resolution date.',
  resolutionCriteria: 'YES if the U.S. 10-year Treasury yield is reported above 4.50% for May 29, 2026 by the official Treasury daily rates data or FRED. NO otherwise.',
  deadline: Math.floor(Date.UTC(2026, 4, 29, 23, 59, 59) / 1000),
  initialLiquidity: ethers.parseUnits('5', USDC_DECIMALS),
  aiProbability: 50n,
  category: 'Rates',
  triggeredByNews: 'Rates volatility ahead of upcoming U.S. macro data.',
}

async function main() {
  const { RPC_URL, DEPLOYER_PRIVATE_KEY, NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS } = process.env

  if (!RPC_URL) throw new Error('Missing RPC_URL environment variable')
  if (!DEPLOYER_PRIVATE_KEY) throw new Error('Missing DEPLOYER_PRIVATE_KEY environment variable')
  if (!NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS) {
    throw new Error('Missing NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS environment variable')
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const network = await provider.getNetwork()
  if (network.chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(`Unexpected chainId ${network.chainId.toString()}`)
  }

  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet)
  const predictionMarket = new ethers.Contract(
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS,
    predictionMarketArtifact.abi,
    wallet,
  )

  const balance = await usdc.balanceOf(wallet.address)
  console.log(`Creating market from ${wallet.address}`)
  console.log(`USDC balance: ${ethers.formatUnits(balance, USDC_DECIMALS)} USDC`)
  if (balance < market.initialLiquidity) {
    throw new Error('Wallet does not have enough USDC for 5 USDC initial liquidity')
  }

  const currentAllowance = await usdc.allowance(wallet.address, NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS)
  if (currentAllowance < market.initialLiquidity) {
    console.log('Approving exactly 5 USDC for PredictionMarket...')
    const approveTx = await usdc.approve(NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS, market.initialLiquidity)
    console.log(`Approval tx: ${approveTx.hash}`)
    await approveTx.wait()
  } else {
    console.log('Existing allowance is sufficient for 5 USDC.')
  }

  console.log('Creating market onchain...')
  const createTx = await predictionMarket.createMarket(
    market.title,
    market.description,
    market.resolutionCriteria,
    market.deadline,
    market.initialLiquidity,
    market.aiProbability,
    market.category,
    market.triggeredByNews,
  )

  console.log(`Create market tx: ${createTx.hash}`)
  const receipt = await createTx.wait()

  let marketId = null
  for (const log of receipt.logs) {
    try {
      const parsed = predictionMarket.interface.parseLog(log)
      if (parsed?.name === 'MarketCreated') {
        marketId = parsed.args.marketId
        break
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  console.log(`Market created: #${marketId === null ? 'unknown' : marketId.toString()}`)
  console.log(`Contract: ${NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
