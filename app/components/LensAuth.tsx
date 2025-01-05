import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { lensClient } from '@/utils/lensClient'
import { evmAddress, SessionClient, Context, AccountMetadata } from '@lens-protocol/client'
import {
  currentSession,
  revokeAuthentication,
  fetchAccount,
  fetchAccountsAvailable
} from '@lens-protocol/client/actions'
import { CreatePost } from './CreatePost'

type AuthStatus = 'idle' | 'checking' | 'signing' | 'loading' | 'error'

export function LensAuth() {
  console.log('LensAuth component rendering')

  const { address, status: walletStatus } = useAccount()
  console.log('Wallet status:', walletStatus, 'Address:', address)

  //const { address, status: walletStatus } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionClient, setSessionClient] = useState<SessionClient<Context> | null>(null)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountMetadata[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AccountMetadata | null>(null)

  // Check for available accounts when wallet is connected
  useEffect(() => {
    const checkAccounts = async () => {
      console.log('checkAccounts running, wallet status:', walletStatus, 'address:', address)

      if (!address || walletStatus !== 'connected') {
        console.log('Skipping checkAccounts - not connected or no address')
        return
      }

      setStatus('checking')
      console.log('Fetching accounts from Lens...')

      try {
        const accountsResult = await fetchAccountsAvailable(lensClient, {
          managedBy: evmAddress(address),
          includeOwned: true
        })

        console.log('Accounts result:', accountsResult)

        if (!accountsResult.isErr() && accountsResult.value?.items) {
          console.log('Found accounts:', accountsResult.value.items)

          const accountPromises = accountsResult.value.items.map(async (item) => {
            const accountResult = await fetchAccount(lensClient, {
              address: item.account.address
            })
            console.log('Individual account result:', accountResult)

            if (!accountResult.isErr() && accountResult.value !== null) {
              const metadata = accountResult.value.metadata
              return {
                __typename: 'AccountMetadata',
                attributes: metadata?.attributes || [],
                bio: metadata?.bio || null,
                coverPicture: metadata?.coverPicture || null,
                id: metadata?.id || item.account.address,
                name: metadata?.name || null,
                picture: metadata?.picture || null
              } as AccountMetadata
            }
            return null
          })

          const resolvedAccounts = (await Promise.all(accountPromises)).filter(
            (account): account is AccountMetadata => account !== null
          )
          console.log('Final resolved accounts:', resolvedAccounts)

          setAccounts(resolvedAccounts)

          if (resolvedAccounts.length === 1) {
            console.log('Auto-selecting single account:', resolvedAccounts[0])
            setSelectedAccount(resolvedAccounts[0])
          }
        }
        setStatus('idle')
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
        setError('Failed to fetch Lens accounts')
        setStatus('error')
      }
    }

    checkAccounts()
  }, [address, walletStatus])

  // Try to resume session when account is selected
  useEffect(() => {
    const resumeSession = async () => {
      if (!selectedAccount) return
      setStatus('checking')

      try {
        const resumed = await lensClient.resumeSession()
        if (!resumed.isErr()) {
          setSessionClient(resumed.value)
          setIsAuthenticated(true)
        }
        setStatus('idle')
      } catch (error) {
        console.error('Failed to resume session:', error)
        setStatus('idle')
      }
    }

    resumeSession()
  }, [selectedAccount])

  const handleLogin = async () => {
    if (!address || !selectedAccount) return
    setStatus('signing')
    setError(null)

    try {
      const result = await lensClient.login({
        onboardingUser: {
          app: '0xe5439696f4057aF073c0FB2dc6e5e755392922e1',
          wallet: evmAddress(address)
        },
        signMessage: (message) => signMessageAsync({ message })
      })

      if (!result.isErr()) {
        setSessionClient(result.value)
        setIsAuthenticated(true)
      }
      setStatus('idle')
    } catch (error) {
      console.error('Login failed:', error)
      setError('Failed to login with Lens')
      setStatus('error')
    }
  }

  const handleLogout = async () => {
    if (!sessionClient) return
    setStatus('loading')
    setError(null)

    try {
      const session = await currentSession(sessionClient)
      if (!session.isErr()) {
        await revokeAuthentication(sessionClient, {
          authenticationId: session.value.authenticationId
        })
        setIsAuthenticated(false)
        setSessionClient(null)
        setSelectedAccount(null)
      }
      setStatus('idle')
    } catch (error) {
      console.error('Logout failed:', error)
      setError('Failed to logout')
      setStatus('error')
    }
  }

  const isLoading = status === 'checking' || status === 'signing' || status === 'loading'
  console.log('Current state:', {
    isAuthenticated,
    status,
    accountsCount: accounts.length,
    hasSelectedAccount: !!selectedAccount,
    isLoading
  })

  if (walletStatus !== 'connected') {
    console.log('Returning null - wallet not connected')
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {accounts.length > 0 && !selectedAccount && (
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">Select your Lens account:</h3>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded"
              >
                {account?.picture && <img src={account.picture} alt="Profile" className="w-8 h-8 rounded-full" />}
                <div className="text-left">
                  <div>{account?.name || account?.id || 'Unnamed Account'}</div>
                  <div className="text-sm text-gray-500">{account.id}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedAccount && !isAuthenticated && (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {status === 'signing' ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing...
            </span>
          ) : status === 'checking' ? (
            'Checking auth...'
          ) : (
            `Login as ${selectedAccount?.name || selectedAccount.id || 'Unnamed Account'}`
          )}
        </button>
      )}

      {isAuthenticated && selectedAccount && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {selectedAccount?.picture && (
                <img src={selectedAccount.picture} alt="Profile" className="w-10 h-10 rounded-full" />
              )}
              <div>
                <div className="font-medium">{selectedAccount?.name || selectedAccount.id || 'Unnamed Account'}</div>
                <div className="text-sm text-gray-500">{selectedAccount.id}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging out...
                </span>
              ) : (
                'Logout from Lens'
              )}
            </button>
          </div>
          <CreatePost />
        </>
      )}
    </div>
  )
}
