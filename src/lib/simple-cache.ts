const cache = new Map<string, string>()

const crypto = await import('crypto')

const hashKey = (key: string) => {
  const hash = crypto.createHash('sha256')
  hash.update(key)
  return hash.digest('hex')
}

export function getFromCache(key: string) {
  const hit = cache.has(hashKey(key))

  console.log(`Cache ${hit ? 'hit' : 'miss'} for key: ${key} (${hashKey(key)})`)

  return cache.get(hashKey(key))
}

export function addToCache(key: string, value: string) {
  cache.set(hashKey(key), value)
}

export function clearCache(): void {
  cache.clear()
}

export function getCacheSize(): number {
  return cache.size
}

export function getAllFromCache(): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of cache.entries()) {
    result[key] = value
  }

  return result
}
