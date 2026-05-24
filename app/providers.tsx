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
const FLINTEX_ICE = '#67e8f9'
const FLINTEX_WALLET_BUTTON = '#080c14'
const FLINTEX_WALLET_BUTTON_INNER = '#060810'
const FLINTEX_DARK = '#060a0f'

const baseWalletTheme = darkTheme({
  accentColor: FLINTEX_ICE,
  accentColorForeground: FLINTEX_DARK,
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
})

const flintexWalletTheme = {
  ...baseWalletTheme,
  colors: {
    ...baseWalletTheme.colors,
    connectButtonBackground: FLINTEX_WALLET_BUTTON,
    connectButtonInnerBackground: FLINTEX_WALLET_BUTTON_INNER,
    connectButtonText: FLINTEX_ICE,
  },
  shadows: {
    ...baseWalletTheme.shadows,
    connectButton: '0 0 0 1px rgba(103, 232, 249, 0.28)',
  },
}

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
