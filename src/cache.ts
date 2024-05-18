import { Cache, createCache, memoryStore, multiCaching } from 'cache-manager'
import { redisInsStore } from 'cache-manager-ioredis-yet'
import { Cluster, Redis } from 'ioredis'

let redis: Redis | Cluster | null = null

if (process.env.REDIS_URL && process.env.REDIS_URL_2) {
  console.log(`Redis URL: ${process.env.REDIS_URL}`)
  console.log(`Redis URL 2: ${process.env.REDIS_URL_2}`)
  redis = new Cluster([process.env.REDIS_URL, process.env.REDIS_URL_2], {})
} else if (process.env.REDIS_URL && !process.env.REDIS_URL_2) {
  console.log(`Redis URL: ${process.env.REDIS_URL}`)
  redis = new Redis(process.env.REDIS_URL ?? '', {
    reconnectOnError: () => true,
    maxRetriesPerRequest: null,
  })
}

const ttl = 345600000

const memCache = createCache(
  memoryStore({
    ttl,
  }),
)

const caches: Cache[] = [memCache]

if (redis) {
  const redisCache = createCache(
    redisInsStore(redis, {
      ttl,
    }),
    {
      ttl,
    },
  )
  caches.push(redisCache)
}

export const cache = multiCaching(caches)
