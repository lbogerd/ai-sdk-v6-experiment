import { codingAgent } from '@/lib/coding-agent'
import { createFileRoute } from '@tanstack/react-router'
import { convertToModelMessages, UIMessage } from 'ai'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const Route = createFileRoute('/demo/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          console.log('Received chat request')
          const { messages }: { messages: UIMessage[] } = await request.json()

          const result = await codingAgent.stream({
            messages: convertToModelMessages(messages),
          })

          console.log('Streaming response from coding agent')
          return result.toUIMessageStreamResponse()
        } catch (error) {
          console.error('Error processing chat request:', error)
          throw error
        }
      },
    },
  },
})
