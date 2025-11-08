import { codingProblemAgent } from '@/lib/coding-problem-agent'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import z from 'zod'

export const Route = createFileRoute('/demo/ai/coding-agent')({
  component: RouteComponent,
})

const getCodingProblemSolutionServerFn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      problem: z.string().describe('The coding problem to solve'),
      expectedOutcome: z
        .string()
        .describe('The expected outcome of the coding problem'),
    }),
  )
  .handler(async ({ data }) => {
    const agent = codingProblemAgent({
      expectedOutcome: data.expectedOutcome,
    })
    const response = await agent.generate({
      prompt: `Solve the following coding problem and provide the code solution:\n\n${data.problem}`,
    })

    console.log('Agent steps:', response.steps)

    return response.text
  })

function RouteComponent() {
  const [solution, setSolution] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">
          Coding Problem Solver
        </h1>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)

            const problem = (formData.get('problem') as string) || ''
            const expectedOutcome =
              (formData.get('expectedOutcome') as string) || ''

            const solution = await getCodingProblemSolutionServerFn({
              data: {
                problem,
                expectedOutcome,
              },
            })

            setSolution(solution)
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Enter Problem
            </span>
            <input
              type="text"
              name="problem"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            />
          </label>

          <label htmlFor="">
            <span className="text-sm font-medium text-gray-700">
              Expected Outcome
            </span>
            <input
              type="text"
              name="expectedOutcome"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            />
            <span className="text-xs text-gray-500">
              (The expected outcome for the coding problem)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Solve Problem
            </button>
          </div>
        </form>

        {solution && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h2 className="text-lg font-medium text-gray-800">Solution</h2>
            <p className="mt-2 text-sm text-gray-700">{solution}</p>
          </div>
        )}
      </div>
    </div>
  )
}
