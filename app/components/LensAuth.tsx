import { useState, useEffect, useCallback } from 'react'
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
import CreateLensProfile from './CreateLensProfile'
import { EditProfile } from './EditLensProfile'

type AuthStatus = 'idle' | 'checking' | 'signing' | 'loading' | 'error'

export function LensAuth() {
  const { address, status: walletStatus } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionClient, setSessionClient] = useState<SessionClient<Context> | null>(null)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountMetadata[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AccountMetadata | null>(null)
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null)

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    setIsAuthenticated(false)
    setSessionClient(null)
    setSelectedAccount(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('lens.session.storage')
      window.localStorage.removeItem('lens.selected.account')
    }
  }, [])

  // Check wallet connection changes
  useEffect(() => {
    if (walletStatus !== 'connected') {
      clearAuthState()
    }
  }, [walletStatus, clearAuthState])

  const checkAccounts = useCallback(async () => {
    if (!address || walletStatus !== 'connected') {
      setAccounts([])
      return
    }

    setStatus('checking')

    try {
      const accountsResult = await fetchAccountsAvailable(lensClient, {
        managedBy: evmAddress(address),
        includeOwned: true
      })

      if (!accountsResult.isErr() && accountsResult.value?.items) {
        const accountPromises = accountsResult.value.items.map(async (item) => {
          const accountResult = await fetchAccount(lensClient, {
            address: item.account.address
          })

          if (!accountResult.isErr() && accountResult.value !== null) {
            const metadata = accountResult.value.metadata
            return {
              __typename: 'AccountMetadata' as const,
              attributes: metadata?.attributes || [],
              bio: metadata?.bio || null,
              coverPicture: metadata?.coverPicture || null,
              id: accountResult.value.address, // Use the account address as ID
              name: metadata?.name || null,
              picture: metadata?.picture || null
            } as AccountMetadata
          }
          return null
        })

        const resolvedAccounts = (await Promise.all(accountPromises)).filter(
          (account): account is AccountMetadata => account !== null
        )

        setAccounts(resolvedAccounts)
      }
      setStatus('idle')
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      setError('Failed to fetch Lens accounts')
      setStatus('error')
    }
  }, [address, walletStatus])

  useEffect(() => {
    checkAccounts()
  }, [checkAccounts])

  // Handle account selection and automatic login
  const handleAccountSelect = async (account: AccountMetadata) => {
    if (!address) return
    setStatus('signing')
    setError(null)
    setSelectedAccount(account)
    setLoadingAccountId(account.id)

    try {
      // Try to resume existing session first
      const resumed = await lensClient.resumeSession()
      if (!resumed.isErr()) {
        setSessionClient(resumed.value)
        setIsAuthenticated(true)
        setStatus('idle')
        return
      }

      // If resume fails, create new session
      const loginParams = {
        accountOwner: {
          account: account.id, // Using account.id which contains the address
          app: '0xe5439696f4057aF073c0FB2dc6e5e755392922e1',
          owner: evmAddress(address)
        }
      }

      const result = await lensClient.login({
        ...loginParams,
        signMessage: (message) => signMessageAsync({ message })
      })

      if (!result.isErr()) {
        setSessionClient(result.value)
        setIsAuthenticated(true)
        setSelectedAccount(account)
      } else {
        throw new Error(result.error.message)
      }
      setStatus('idle')
      setLoadingAccountId(null)
    } catch (error) {
      console.error('Login failed:', error)
      setError('Failed to login with Lens')
      setStatus('error')
      setSelectedAccount(null)
    }
  }

  const handleLogout = async () => {
    if (!sessionClient) return
    setStatus('loading')
    setError(null)

    try {
      const session = await currentSession(sessionClient)
      if (!session.isErr()) {
        const revokeResult = await revokeAuthentication(sessionClient, {
          authenticationId: session.value.authenticationId
        })

        if (revokeResult.isErr()) {
          console.error('Failed to revoke authentication:', revokeResult.error)
        }
      }
    } catch (error) {
      console.error('Logout operation failed:', error)
    } finally {
      clearAuthState()
      setStatus('idle')
      await checkAccounts()
    }
  }

  const handleProfileCreated = async () => {
    await checkAccounts()
  }

  const isLoading = status === 'checking' || status === 'signing' || status === 'loading'

  if (walletStatus !== 'connected') {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {accounts.length === 0 && (
        <CreateLensProfile onSuccess={handleProfileCreated} onError={(error) => setError(error.message)} />
      )}

      {accounts.length > 0 && !selectedAccount && (
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">Select your Lens account:</h3>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded"
                disabled={isLoading}
              >
                {isLoading && account.id === loadingAccountId ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-purple-600"
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
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    {account?.picture && <img src={account.picture} alt="Profile" className="w-8 h-8 rounded-full" />}
                    <div className="text-left">
                      <div>{account?.name || account?.id || 'Unnamed Account'}</div>
                      <div className="text-sm text-gray-500">{account.id}</div>
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
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

            <EditProfile
              currentProfile={{
                name: selectedAccount.name,
                bio: selectedAccount.bio,
                id: selectedAccount.id
              }}
              onSuccess={checkAccounts}
              onError={(error) => setError(error.message)}
            />

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

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Create Post</h3>
            <CreatePost />
          </div>
        </>
      )}
    </div>
  )
}
