'use client'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import type { Chain } from 'viem'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc-node.thecanteenapp.com/v1/swrm_2654ec0ed6f429cbd2f1c606bd73908182839e25914786e1b3e20f570f3b1435'] }
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.network' }
  },
  testnet: true,
} as const satisfies Chain

const config = getDefaultConfig({
  appName: 'Flintex',
  projectId: 'flintex-agora',
  chains: [arcTestnet],
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
