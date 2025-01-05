import { useState } from 'react'
import { createPost } from '@/utils/postActions'
import { useAccount, useWalletClient } from 'wagmi'

type PostStatus = 'idle' | 'creating' | 'indexing' | 'complete' | 'error'

export function CreatePost() {
  const { isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<PostStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !walletClient) {
      setError('Please connect your wallet first')
      return
    }

    setStatus('creating')
    setError(null)
    setTxHash(null)

    try {
      const result = await createPost(content, walletClient)

      if (result.isErr()) {
        throw new Error(result.error.message)
      }

      setTxHash(result.value)
      setStatus('complete')
      setContent('')
    } catch (err) {
      console.error('Failed to create post:', err)
      setError(err instanceof Error ? err.message : 'Failed to create post')
      setStatus('error')
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'creating':
        return 'Creating post...'
      case 'indexing':
        return 'Waiting for indexing...'
      case 'complete':
        return 'Post created successfully!'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="p-2 border rounded"
          rows={4}
          disabled={status !== 'idle'}
        />
        {error && <p className="text-red-500">{error}</p>}
        {status !== 'idle' && status !== 'error' && <p className="text-blue-500">{getStatusMessage()}</p>}
        {txHash && (
          <p className="text-sm text-gray-500">
            Transaction: {txHash.slice(0, 6)}...{txHash.slice(-4)}
          </p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={status !== 'idle' || !content.trim() || !isConnected}
        >
          {status === 'idle' ? 'Post' : 'Posting...'}
        </button>
      </form>
    </div>
  )
}
