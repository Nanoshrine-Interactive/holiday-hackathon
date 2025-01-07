import { useEffect, useState } from 'react'
import { useAccount, useSignMessage, useWalletClient } from 'wagmi'
import { lensTestnet } from '@/config'
import { lensClient } from '@/utils/lensClient'
import { storageClient } from '@/utils/storageClient'
import { embed } from '@lens-protocol/metadata'
import { post } from '@lens-protocol/client/actions'
import { evmAddress, TxHash, TransactionIndexingError, UnexpectedError, ResultAsync } from '@lens-protocol/client'
import { convertTestBeaconToString } from '@/utils/sceneConverter'

interface CreateBeaconProps {
  profileId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function CreateBeacon({ profileId, onSuccess, onError }: CreateBeaconProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { signMessageAsync } = useSignMessage()
  const [description, setDescription] = useState('')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (successMessage) {
      timeoutId = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [successMessage])

  const createSceneHTML = () => {
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@react-three/fiber@8.12.0/dist/react-three-fiber.min.js"></script>
          <script src="https://unpkg.com/three@0.150.1/build/three.min.js"></script>
          <script src="https://unpkg.com/@react-three/drei@9.65.3/index.min.js"></script>
          <style>
            body { margin: 0; }
            canvas { width: 100vw; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            ${convertTestBeaconToString()}
          </script>
        </body>
      </html>`
  }

  const handleCreateBeacon = async () => {
    if (!address || !walletClient || !profileId) return

    setIsPosting(true)
    setError(null)

    try {
      const loginResult = await lensClient.login({
        accountOwner: {
          account: profileId,
          app: '0xe5439696f4057aF073c0FB2dc6e5e755392922e1',
          owner: evmAddress(address)
        },
        signMessage: (message) => signMessageAsync({ message })
      })

      if (loginResult.isErr()) {
        throw new Error('Failed to authenticate')
      }

      const sessionClient = loginResult.value
      const sceneHTML = createSceneHTML()
      const sceneFile = new File([new Blob([sceneHTML], { type: 'text/html' })], 'scene.html', {
        type: 'text/html',
        lastModified: Date.now()
      })

      const sceneUploadResult = await storageClient.uploadFile(sceneFile)
      const metadata = embed({
        embed: sceneUploadResult.uri,
        content: description,
        // @ts-ignore
        mainContentFocus: 'EMBED'
      })

      const { uri } = await storageClient.uploadAsJson(metadata)
      console.log('Metadata uploaded:', uri)

      const postResult = await post(sessionClient, {
        contentUri: uri
      })

      if (postResult.isErr()) {
        throw new Error(`Failed to create post: ${postResult.error.message}`)
      }

      if ('raw' in postResult.value) {
        const { to, data, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = postResult.value.raw

        try {
          const hash = await walletClient.sendTransaction({
            to,
            data,
            gas: BigInt(gasLimit),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
            chain: lensTestnet
          })

          console.log('Transaction hash:', hash)

          const indexed = await Promise.race([
            sessionClient.waitForTransaction(hash as TxHash),
            new Promise<ResultAsync<TxHash, TransactionIndexingError | UnexpectedError>>((_, reject) =>
              setTimeout(() => reject(new Error('Transaction indexing timed out')), 60000)
            )
          ])

          if (indexed.isErr()) {
            throw new Error(`Failed to index transaction: ${indexed.error.message}`)
          }

          console.log('Transaction indexed:', indexed.value)
        } catch (txError) {
          console.error('Transaction error:', txError)
          throw new Error(`Transaction failed: ${txError instanceof Error ? txError.message : 'Unknown error'}`)
        }
      }

      setDescription('')
      setIsPosting(false)
      setSuccessMessage('Beacon created successfully!')
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create beacon:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create beacon'
      setError(errorMessage)
      setIsPosting(false)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Create Beacon</h3>

      {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}

      <div className="space-y-4">
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for your beacon..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            rows={3}
          />
        </div>

        <button
          onClick={handleCreateBeacon}
          disabled={isPosting}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPosting ? 'Creating Beacon...' : 'Create Beacon'}
        </button>

        {successMessage && <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">{successMessage}</div>}
      </div>
    </div>
  )
}
