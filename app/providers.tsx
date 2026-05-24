'use client'
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit'
import type { Chain } from 'viem'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' },
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
const flintexWalletTheme = darkTheme({
  accentColor: '#67e8f9',
  accentColorForeground: '#060a0f',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={flintexWalletTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
