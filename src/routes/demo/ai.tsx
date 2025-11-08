import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { generateText } from 'ai'
import { openRouter } from '@/lib/openrouter'
import { addToCache, getFromCache } from '@/lib/simple-cache'
import z from 'zod'
import { useState } from 'react'

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

export const Route = createFileRoute('/demo/ai')({
  component: DemoAI,
})

function DemoAI() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const generateText = useServerFn(generateTextServerFn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const text = await generateText({ data: { prompt } })
      setResult(text)
    } catch (error) {
      console.error('Error generating text:', error)
      setResult('Error generating text')
    } finally {
      setLoading(false)
    }
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
    </div>
  )
}
