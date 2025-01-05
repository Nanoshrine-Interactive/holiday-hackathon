'use client'

import { useAccount } from 'wagmi'
import { LensAuth } from './components/LensAuth'
import { CreatePost } from './components/CreatePost'
import { useSIWE } from 'connectkit'

function App() {
  const { isConnected } = useAccount()
  const { isSignedIn } = useSIWE()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Lens Protocol Demo</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Authentication</h2>
        <LensAuth />
      </div>

      {/* Only show CreatePost when wallet is connected and SIWE is complete */}
      {isConnected && isSignedIn && (
        <div className="mb-8">
          <h1>Logged in!</h1>
          <h2 className="text-xl font-semibold mb-4">Create Post</h2>
          <CreatePost />
        </div>
      )}
    </div>
  )
}

export default App
