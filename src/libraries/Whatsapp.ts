import wa, {
  makeWASocket,
  WASocket,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  BufferJSON,
  jidNormalizedUser,
  isJidBroadcast,
  isJidStatusBroadcast,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { pino } from 'pino'
import { cache } from '../cache.js'
import { bqueue } from '../queue.js'
import NodeCache from 'node-cache'

const { proto } = wa

class Whatsapp {
  /**
   * Whatsapp connection Object
   *
   * @params WASocket | null
   */
  protected wa: WASocket | null

  /**
   * Whatsapp session path
   *
   * @params string
   */
  protected sessionPath: string

  /**
   * Whatsapp QRCode
   *
   * @params string
   */
  protected qrCode: string | undefined

  /**
   * Presence Interval
   *
   * @params NodeJS.Timer | string | number
   */
  protected presenceInterval: NodeJS.Timer | string | number | undefined

  /**
   * Connection Status
   *
   * @params 'connecting' | 'open' | 'close'
   */
  protected connectionStatus: 'connecting' | 'open' | 'close' | undefined

  protected msgRetryCounterCache = new NodeCache()

  constructor() {
    this.wa = null
    this.sessionPath = resolve(cwd(), '.sessions')
    this.qrCode = undefined
    this.connectionStatus = undefined
    this.presenceInterval = undefined
  }

  /**
   * Connect to whatsapp server
   *
   * @returns Promise<WASocket | null>
   */
  public connect(
    callback?: (
      qr: string | undefined,
      connection: 'connecting' | 'open' | 'close' | undefined,
    ) => void,
  ) {
    return new Promise<WASocket | null>(async (resolve) => {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath)
      const { version, isLatest } = await fetchLatestBaileysVersion()
      const logger = pino({
        level: 'fatal',
      }) as any
      console.log(
        `Start connection using WA v${version.join('.')}, isLatest: ${isLatest}`,
      )
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache: this.msgRetryCounterCache,
        logger: logger,
        printQRInTerminal: false,
        syncFullHistory: false,
        browser: Browsers.windows('Microsoft Edge'),
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 15_000,
        connectTimeoutMs: 15_000,
        getMessage: async (key) => {
          if (!key.id) {
            return undefined
          }
          const msgCache = await cache.get<string | null | undefined>(key.id)

          if (!msgCache) {
            return undefined
          }

          try {
            console.log(`Get message from cache: ${key.id}`)
            const msgObj = JSON.parse(msgCache, BufferJSON.reviver)
            console.log(`Message from cache: ${msgCache}`)
            return proto.Message.fromObject(msgObj)
          } catch (error: any) {
            console.warn(
              `Error parsing message cache: ${error?.message ?? '-'}`,
            )
          }

          return undefined
        },
      })

      if (callback) {
        callback(this.qrCode, this.connectionStatus)
      }

      /**
       * Whatsapp Creds update
       */
      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('messages.upsert', async (messages) => {
        messages.messages.forEach((message) => {
          const msgId = message.key.id ?? null
          const jid = message.key.remoteJid
            ? jidNormalizedUser(message.key.remoteJid)
            : null

          if (!jid || !message.message || !msgId) {
            return
          }

          if (isJidBroadcast(jid) || isJidStatusBroadcast(jid)) {
            return
          }

          const msg = proto.Message.create(message.message)

          const msgObj = proto.Message.toObject(msg, {
            defaults: true,
            arrays: true,
          })
          cache.set(msgId, JSON.stringify(msgObj, BufferJSON.replacer))
        })
      })

      /**
       * Whatsapp Connection Events
       */
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        this.qrCode = qr
        const id = process.env.WA_ONLINE_SEND_TO ?? null

        if (callback) {
          callback(qr, connection)
        }

        switch (connection) {
          case 'connecting':
            console.log('Connecting ...')
            this.connectionStatus = 'connecting'
            this.wa = null
            break

          case 'close':
            const statusCode = (lastDisconnect?.error as Boom)?.output
              ?.statusCode
            const shouldReconnect =
              statusCode === DisconnectReason.restartRequired
            console.log(
              `Connection closed due to ${lastDisconnect?.error}, reconnecting ${shouldReconnect}, disconected reason ${statusCode}`,
            )

            // reconnect if not logged out
            if (shouldReconnect) {
              console.log('Trying to reconnecting ...')
              return await this.connect()
            } else if (statusCode === DisconnectReason.loggedOut) {
              console.log('Connection closed due to user logged out')
              if (existsSync(this.sessionPath)) {
                rmSync(this.sessionPath, {
                  force: true,
                  recursive: true,
                })
              }
              this.wa = null
              this.connectionStatus = 'close'
              return resolve(null)
            }
            process.exit(0)
            break

          case 'open':
            console.log('Connection open')
            this.connectionStatus = 'open'
            this.wa = sock
            if (id) {
              console.log('Sending message to ' + id)
              sock.sendMessage(id, { text: 'Whatsapp Online ✅' })
            }

            bqueue.process(async (job) => {
              const { jid, message } = job.data
              console.log(`Send Message to ${jid} : ${message}`)
              try {
                await sock.presenceSubscribe(jid)
                await sock.sendPresenceUpdate('composing', jid)
                await new Promise((resolve) => setTimeout(resolve, 75))
                await sock.sendPresenceUpdate('available', jid)

                const res = await sock.sendMessage(jid, {
                  body: message,
                  text: message,
                })

                if (res == undefined || !res.key.id || !res.message) {
                  console.warn(`Failed to send message to ${jid}`)
                  return
                }
                console.log(`Successfully send message to ${jid}`)

                const msg = proto.Message.create(res.message)

                const msgObj = proto.Message.toObject(msg, {
                  defaults: true,
                  arrays: true,
                })
                cache
                  .set(res.key.id, JSON.stringify(msgObj, BufferJSON.replacer))
                  .then(() => {
                    console.log(`Successfully save message to cache ${jid}`)
                  })
                  .catch(() =>
                    console.error(`Failed to save message to cache ${jid}`),
                  )
              } catch (error) {
                console.error(`Failed to send message to ${jid}`, error)
              }
            })

            setInterval(() => {
              sock
                .sendPresenceUpdate('available')
                .catch(() => console.error('Failed to send presence update'))
            }, 15_000)
            resolve(this.wa)
        }
      })
    })
  }

  /**
   * Get whatsapp connection object
   *
   * @returns WASocket | null
   */
  public get(): WASocket | null {
    return this.wa
  }

  /**
   * Get QR Code
   * @returns string | undefined
   */
  public getQrCode(): string | undefined {
    return this.qrCode
  }

  /**
   * Get connection status
   *
   * @returns 'connecting' | 'open' | 'close' | undefined
   */
  public getStatus(): 'connecting' | 'open' | 'close' | undefined {
    return this.connectionStatus
  }
}

export default new Whatsapp()
