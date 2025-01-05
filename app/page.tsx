'use client'

import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { LensAuth } from './components/LensAuth'

function App() {
  const account = useAccount()
  console.log('App component wallet status:', account)

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Account</h2>
        <ConnectKitButton />

        <div className="text-sm">
          <div>status: {account.status}</div>
          <div>addresses: {JSON.stringify(account.addresses)}</div>
          <div>chainId: {account.chainId}</div>
        </div>

        {account.status === 'connected' && (
          <div>
            <h2 className="text-xl font-bold mt-8 mb-4">Lens Protocol</h2>
            <LensAuth />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
