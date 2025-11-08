import { weatherAgent } from '@/lib/weather-agent'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import z from 'zod'

const getWeatherServerFn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      location: z.string().describe('The location to get the weather for'),
    }),
  )
  .handler(async ({ data }) => {
    const response = await weatherAgent.generate({
      prompt: `What is the weather in ${data.location}?`,
    })

    console.log('Agent steps:', response.steps)

    return response.text
  })

export const Route = createFileRoute('/demo/ai/agent')({
  component: RouteComponent,
})

function RouteComponent() {
  const [weatherInfo, setWeatherInfo] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">
          Weather Information
        </h1>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const location = (formData.get('location') as string) || ''

            const weatherInfo = await getWeatherServerFn({ data: { location } })
            setWeatherInfo(weatherInfo)
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Enter Location
            </span>
            <input
              type="text"
              name="location"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Get Weather
            </button>
          </div>
        </form>

        {weatherInfo && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h2 className="text-lg font-medium text-gray-800">Weather Info</h2>
            <p className="mt-2 text-sm text-gray-700">{weatherInfo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
