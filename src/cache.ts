import { Cache, createCache, memoryStore, multiCaching } from 'cache-manager'
import { redisInsStore } from 'cache-manager-ioredis-yet'
import { Redis } from 'ioredis'

const ttl = 345600000
const memCache = createCache(
  memoryStore({
    ttl,
  }),
)
const caches: Cache[] = [memCache]

if (process.env.REDIS_URL) {
  console.log(`Redis URL: ${process.env.REDIS_URL}`)
  caches.push(
    createCache(
      redisInsStore(
        new Redis(process.env.REDIS_URL, {
          reconnectOnError: () => true,
          maxRetriesPerRequest: null,
          db: 1,
        }),
        {
          ttl,
        },
      ),
      {
        ttl,
      },
    ),
  )
}

if (process.env.REDIS_URL_2) {
  console.log(`Redis URL 2: ${process.env.REDIS_URL_2}`)
  caches.push(
    createCache(
      redisInsStore(
        new Redis(process.env.REDIS_URL_2, {
          reconnectOnError: () => true,
          maxRetriesPerRequest: null,
          db: 1,
        }),
        {
          ttl,
        },
      ),
      {
        ttl,
      },
    ),
  )
}

export const cache = multiCaching(caches)
