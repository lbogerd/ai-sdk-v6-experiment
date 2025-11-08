import { ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'

export const weatherAgent = new ToolLoopAgent({
  model: 'openai/gpt-4o',
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: 'Convert temperature from Fahrenheit to Celsius',
      inputSchema: z.object({
        temperature: z.number().describe('Temperature in Fahrenheit'),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9))
        return { celsius }
      },
    }),
  },
})

const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco in celsius?',
})

console.log(result.text) // agent's final answer
console.log(result.steps) // steps taken by the agent
