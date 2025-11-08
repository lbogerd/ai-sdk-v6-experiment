import { ToolLoopAgent, tool } from 'ai'
import z from 'zod'
import { openRouter } from './openrouter'

export const codingProblemAgent = ({
  expectedOutcome,
}: {
  expectedOutcome: string
}) =>
  new ToolLoopAgent({
    model: openRouter('openrouter/polaris-alpha'),
    tools: {
      runCode: tool({
        description:
          'Run a piece of JavaScript/TypeScript code and return the output. Wrap code in a function if needed. If there is an error, returns the error message as output.',
        inputSchema: z.object({
          code: z.string().describe('The code to run'),
        }),
        execute: async ({ code }) => {
          try {
            // Using Function constructor to create a new function from the code string
            const func = new Function(code)
            if (!func) {
              throw new Error('No function could be created from the code')
            }

            if (typeof func !== 'function') {
              throw new Error('The provided code does not return a function')
            }

            // handle both async and sync functions
            let result
            if (func.constructor.name === 'AsyncFunction') {
              result = await func()
            } else {
              result = func()
            }

            if (typeof result === 'object' && result !== null) {
              return { output: JSON.stringify(result) }
            }

            return { output: String(result) }
          } catch (error) {
            return { output: `Error: ${(error as Error).message}` }
          }
        },
      }),
      checkOutcome: tool({
        description:
          'Check if the output of the code matches the expected outcome',
        inputSchema: z.object({
          output: z.string().describe('The output from running the code'),
        }),
        execute: async ({ output }) => {
          const isSuccess = output.trim() === expectedOutcome.trim()

          return { isSuccess }
        },
      }),
    },
  })
