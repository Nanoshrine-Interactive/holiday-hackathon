'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { ConnectKitProvider } from 'connectkit'
import { siweClient } from '../utils/siweClient'
import { config } from '../config'

const queryClient = new QueryClient()

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <siweClient.Provider
          enabled={true}
          nonceRefetchInterval={300000} // 5 minutes
          sessionRefetchInterval={300000} // 5 minutes
          signOutOnDisconnect={true}
          signOutOnAccountChange={true}
          signOutOnNetworkChange={true}
        >
          <ConnectKitProvider>{props.children}</ConnectKitProvider>
        </siweClient.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
