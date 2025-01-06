import React, { useState, useEffect } from 'react'
import { lensClient } from '@/utils/lensClient'
import { storageClient } from '@/utils/storageClient'
import { fetchPosts } from '@lens-protocol/client/actions'

// Define types based on the Lens Protocol documentation
interface PostMetadata {
  content?: string
}

interface PostAuthor {
  handle?: string | null
  name?: string | null
  picture?: {
    uri?: string
  } | null
}

interface PostStats {
  comments: number
  reposts: number
  quotes: number
  upvotes: number
}

interface Post {
  id: string
  timestamp: string
  metadata: PostMetadata
  author: PostAuthor
  stats: PostStats
  root?: { id: string }
  quoteOf?: { id: string }
  commentOn?: { id: string }
}

interface UserPostFeedProps {
  profileId: string
}

export function UserPostFeed({ profileId }: UserPostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchUserPosts = async (reset = false) => {
    if (!profileId || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchPosts(lensClient, {
        filter: {
          authors: [profileId]
        },
        cursor: reset ? null : cursor,
        pageSize: 10
      })

      if (result.isErr()) {
        throw new Error(result.error.message)
      }

      // Transform the posts to match our Post interface
      const transformPost = (post: any): Post => ({
        id: post.id,
        timestamp: post.createdAt,
        metadata: {
          content: post.metadata && 'content' in post.metadata ? post.metadata.content : undefined
        },
        author: {
          handle: post.by?.username?.localName || null,
          name: post.by?.metadata?.displayName || null,
          picture: post.by?.metadata?.picture || null
        },
        stats: {
          comments: post.stats?.comments || 0,
          reposts: post.stats?.reposts || 0,
          quotes: post.stats?.quotes || 0,
          upvotes: post.stats?.upvotes || 0
        },
        root: post.root ? { id: post.root.id } : undefined,
        quoteOf: post.quoteOf ? { id: post.quoteOf.id } : undefined,
        commentOn: post.commentOn ? { id: post.commentOn.id } : undefined
      })

      const postsData = result.value.items.map(transformPost)

      setPosts((prevPosts) => (reset ? postsData : [...prevPosts, ...postsData]))

      // Update cursor and hasMore status
      setCursor(result.value.pageInfo.next || null)
      setHasMore(!!result.value.pageInfo.next)

      setIsLoading(false)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setError('Failed to load posts')
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchUserPosts(true)
  }, [profileId])

  // Helper to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Render individual post
  const renderPost = (post: Post) => {
    return (
      <div key={post.id} className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
        {/* Author Info */}
        <div className="flex items-center mb-3">
          {post.author?.picture && (
            <img
              src={storageClient.resolve(post.author.picture.uri ?? '')}
              alt={post.author.name || 'Profile'}
              className="w-10 h-10 rounded-full mr-3"
            />
          )}
          <div>
            <div className="font-medium">{post.author?.name || 'Unnamed Account'}</div>
            {post.author?.handle && <div className="text-sm text-gray-500">@{post.author.handle}</div>}
          </div>
        </div>

        {/* Post Content */}
        {post.metadata?.content && <p className="mb-3 text-gray-800">{post.metadata.content}</p>}

        {/* Timestamp */}
        <div className="text-xs text-gray-500 mb-3">{formatTimestamp(post.timestamp)}</div>

        {/* Post Stats */}
        <div className="flex justify-between text-sm text-gray-600">
          <span>💬 {post.stats?.comments || 0} Comments</span>
          <span>🔁 {post.stats?.reposts || 0} Reposts</span>
          <span>❤️ {post.stats?.upvotes || 0} Likes</span>
        </div>
      </div>
    )
  }

  // Load more posts handler
  const handleLoadMore = () => {
    fetchUserPosts()
  }

  // Render component
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Posts</h3>

      {/* Error State */}
      {error && <div className="text-red-500 text-center py-4">{error}</div>}

      {/* Loading State */}
      {isLoading && posts.length === 0 && (
        <div className="flex justify-center items-center py-4">
          <svg
            className="animate-spin h-5 w-5 text-purple-600"
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
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center text-gray-500 py-4">No posts yet. Create your first post!</div>
      )}

      {/* Render Posts */}
      <div>{posts.map(renderPost)}</div>

      {/* Load More Button */}
      {!isLoading && posts.length > 0 && hasMore && (
        <div className="text-center">
          <button onClick={handleLoadMore} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Load More Posts
          </button>
        </div>
      )}
    </div>
  )
}
