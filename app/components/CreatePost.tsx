import { useState } from 'react'
import { useAccount, useSignMessage, useWalletClient } from 'wagmi'
import { lensTestnet } from '@/config'
import { lensClient } from '@/utils/lensClient'
import { storageClient } from '@/utils/storageClient'
import { textOnly } from '@lens-protocol/metadata'
import { post } from '@lens-protocol/client/actions'
import { handleWith } from '@lens-protocol/client/viem'
import {
  evmAddress,
  Result,
  ResultAsync,
  TransactionIndexingError,
  TxHash,
  UnexpectedError
} from '@lens-protocol/client'

// Interface for the post form data
interface PostFormData {
  content: string
  media?: File | null
}

// Interface for component props
interface CreatePostProps {
  profileId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function CreatePost({ profileId, onSuccess, onError }: CreatePostProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signMessageAsync } = useSignMessage()
  const [formData, setFormData] = useState<PostFormData>({
    content: '',
    media: null
  })

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      content: e.target.value
    }))
  }

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({
      ...prev,
      media: file
    }))
  }

  // Main post creation handler
  const handleCreatePost = async () => {
    if (!address || !walletClient || !profileId) return

    setIsPosting(true)
    setError(null)

    try {
      // Login as account owner
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

      // Prepare media if uploaded
      let mediaUri = null
      if (formData.media) {
        const mediaResult = await storageClient.uploadFile(formData.media)
        mediaUri = mediaResult.uri
      }

      // Create post metadata
      const metadata = textOnly({
        content: formData.content,
        ...(mediaUri ? { attachments: [{ uri: mediaUri }] } : {})
      })

      // Upload metadata
      const { uri } = await storageClient.uploadAsJson(metadata)
      console.log('Metadata uploaded:', uri)

      // Create post
      const postResult = await post(sessionClient, {
        contentUri: uri
      })

      if (postResult.isErr()) {
        throw new Error(`Failed to create post: ${postResult.error.message}`)
      }

      // Handle the transaction
      if ('raw' in postResult.value) {
        const { to, data, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = postResult.value.raw

        try {
          // Send transaction
          const hash = await walletClient.sendTransaction({
            to,
            data,
            gas: BigInt(gasLimit),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
            chain: lensTestnet
          })

          console.log('Transaction hash:', hash)

          // Wait for transaction with timeout
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
      } else {
        throw new Error('Invalid transaction format received')
      }

      // Reset form and call success callback
      setFormData({ content: '', media: null })
      setIsPosting(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create post:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post'
      setError(errorMessage)
      setIsPosting(false)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  return (
    <div className="border rounded p-4">
      <h3 className="font-medium mb-4">Create Post</h3>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="space-y-4">
        <textarea
          value={formData.content}
          onChange={handleInputChange}
          placeholder="What's on your mind?"
          className="w-full border rounded p-2 min-h-[100px]"
          disabled={isPosting}
        />

        <div className="flex items-center space-x-4">
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="file:mr-4 file:rounded file:border-0 file:bg-purple-50 file:px-4 file:py-2"
            disabled={isPosting}
          />
        </div>

        <button
          onClick={handleCreatePost}
          disabled={isPosting || !formData.content.trim()}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isPosting ? (
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
              Posting...
            </span>
          ) : (
            'Create Post'
          )}
        </button>
      </div>
    </div>
  )
}
