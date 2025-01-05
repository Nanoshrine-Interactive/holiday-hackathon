import { getDefaultConfig } from 'connectkit'
import { createConfig } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, sepolia } from 'wagmi/chains'

export const config = createConfig(
  getDefaultConfig({
    appName: 'ConnectKit Next.js demo',
    chains: [mainnet, polygon, sepolia, optimism, arbitrum],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!
  })
)

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
