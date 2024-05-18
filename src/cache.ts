import { createCache } from 'cache-manager'
import { redisInsStore } from 'cache-manager-ioredis-yet'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL ?? '', {
  reconnectOnError: () => true,
  maxRetriesPerRequest: null,
})

console.log(`Redis URL: ${process.env.REDIS_URL}`)

export const cache = createCache(
  redisInsStore(redis, {
    ttl: 4 * 24 * 60 * 60 * 1000, // 4 days
  }),
)
