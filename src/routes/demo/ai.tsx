import { useChat } from '@ai-sdk/react'
import { createFileRoute } from '@tanstack/react-router'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'

export const Route = createFileRoute('/demo/ai')({
  component: Page,
})

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/demo/api/chat',
    }),
  })
  const [input, setInput] = useState('')

  const isActive = status === 'submitted' || status === 'streaming'

  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) {
            sendMessage({ text: input })
            setInput('')
          }
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Say something..."
        />
        <button
          className="px-4 py-2 ml-2 bg-blue-500 text-white rounded cursor-pointer transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={status !== 'ready'}
        >
          Submit
        </button>
      </form>
      {isActive && (
        <p
          className="mt-2 text-sm text-gray-600 animate-pulse"
          role="status"
          aria-live="polite"
        >
          The model is thinking...
        </p>
      )}
    </>
  )
}
