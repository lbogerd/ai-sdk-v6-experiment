import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { generateText } from 'ai'
import { openRouter } from '@/lib/openrouter'
import { addToCache, getAllFromCache, getFromCache } from '@/lib/simple-cache'
import z from 'zod'
import { useCallback, useState } from 'react'

const generateTextServerFn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      prompt: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    if (getFromCache(data.prompt)) {
      return getFromCache(data.prompt)!
    }

    const result = await generateText({
      model: openRouter('openrouter/polaris-alpha'),
      prompt: data.prompt,
    })

    addToCache(data.prompt, result.text)

    return result.text
  })

const getCacheServerFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  return getAllFromCache()
})

export const Route = createFileRoute('/demo/ai/simple')({
  component: DemoAI,
})

function DemoAI() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cache, setCache] = useState<Record<string, string> | null>(null)
  const [cacheLoading, setCacheLoading] = useState(false)
  const [cacheError, setCacheError] = useState<string | null>(null)
  const [showCache, setShowCache] = useState(false)
  const generateText = useServerFn(generateTextServerFn)
  const fetchCache = useServerFn(getCacheServerFn)

  const loadCache = useCallback(async () => {
    setCacheLoading(true)
    setCacheError(null)

    try {
      const data = await fetchCache()
      setCache(data)
    } catch (error) {
      console.error('Error fetching cache:', error)
      setCacheError('Error fetching cache')
    } finally {
      setCacheLoading(false)
    }
  }, [fetchCache])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const text = await generateText({ data: { prompt } })
      setResult(text)
      if (showCache) {
        void loadCache()
      }
    } catch (error) {
      console.error('Error generating text:', error)
      setResult('Error generating text')
    } finally {
      setLoading(false)
    }
  }

  const handleViewCache = () => {
    setShowCache(true)
    void loadCache()
  }

  const handleHideCache = () => {
    setShowCache(false)
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">AI Text Generation Demo</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ask me anything..."
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Text'}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <p className="whitespace-pre-wrap">{result}</p>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cache</h2>
          <div className="space-x-2">
            <button
              type="button"
              onClick={showCache ? () => void loadCache() : handleViewCache}
              disabled={cacheLoading}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {cacheLoading
                ? 'Loading...'
                : showCache
                  ? 'Refresh Cache'
                  : 'View Cache'}
            </button>
            {showCache && (
              <button
                type="button"
                onClick={handleHideCache}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Hide
              </button>
            )}
          </div>
        </div>

        {showCache && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            {cacheLoading && (
              <p className="text-sm text-gray-600">Loading cache...</p>
            )}
            {cacheError && <p className="text-sm text-red-600">{cacheError}</p>}
            {!cacheLoading &&
              !cacheError &&
              cache &&
              Object.keys(cache).length === 0 && (
                <p className="text-sm text-gray-600">Cache is empty.</p>
              )}
            {!cacheLoading &&
              !cacheError &&
              cache &&
              Object.entries(cache).length > 0 && (
                <ul className="space-y-3">
                  {Object.entries(cache).map(([key, value]) => (
                    <li
                      key={key}
                      className="border border-gray-200 rounded-md p-3"
                    >
                      <p className="text-xs font-mono text-gray-500 break-all">
                        Hash: {key}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {value}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            {!cacheLoading && !cacheError && cache === null && (
              <p className="text-sm text-gray-600">No cache data loaded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
