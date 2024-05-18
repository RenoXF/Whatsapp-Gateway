import PQueue from 'p-queue'
import BQueue from 'bee-queue'

export const queue = new PQueue({
  concurrency: 1,
  interval: 50,
})

export const bqueue = new BQueue('whatsapp', {
  redis: {
    db: 2,
  },
})
