import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openRouter = createOpenRouter({
  // directly using process.env here because t3env is not working?
  apiKey: process.env.OPENROUTER_API_KEY,
})
