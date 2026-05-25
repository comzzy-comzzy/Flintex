import predictionMarketArtifact from '@/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json'
import type { Abi, Address } from 'viem'

const configuredPredictionMarketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS
const DEPLOYED_PREDICTION_MARKET_ADDRESS = '0xd8996367956337eF9864A8D7C96293b88192a7b6' as Address

export const ARC_TESTNET_CHAIN_ID = 5042002
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Address
export const USDC_DECIMALS = 6
export const PREDICTION_MARKET_ADDRESS = (configuredPredictionMarketAddress
  ? (configuredPredictionMarketAddress as Address)
  : DEPLOYED_PREDICTION_MARKET_ADDRESS)

export const PREDICTION_MARKET_ABI = predictionMarketArtifact.abi as Abi

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
