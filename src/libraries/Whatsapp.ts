import waSocket, {
  WASocket,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'
import { cwd, exit } from 'process'
import P from 'pino'

class Whatsapp {
  /**
   * Whatsapp connection Object
   *
   * @params ReturnType<typeof waSocket> | null
   */
  protected wa: ReturnType<typeof waSocket> | null

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
   * @returns Promise<ReturnType<typeof waSocket> | null>
   */
  public connect(
    callback?: (
      qr: string | undefined,
      connection: 'connecting' | 'open' | 'close' | undefined,
    ) => void,
  ) {
    return new Promise<ReturnType<typeof waSocket> | null>(async (resolve) => {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath)
      const { version, isLatest } = await fetchLatestWaWebVersion({})
      console.log(
        `Start connection using WA v${version.join('.')}, isLatest: ${isLatest}`,
      )
      const sock = waSocket({
        version,
        auth: state,
        logger: P({
          level: 'fatal',
        }) as any,
        printQRInTerminal: false,
        syncFullHistory: false,
        browser: Browsers.macOS('Desktop'),
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 15_000,
        connectTimeoutMs: 15_000,
      })

      if (callback) {
        callback(this.qrCode, this.connectionStatus)
      }

      /**
       * Whatsapp Creds update
       */
      sock.ev.on('creds.update', saveCreds)

      /**
       * Whatsapp Connection Events
       */
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        this.qrCode = qr
        const id = '62895609323302@s.whatsapp.net'

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
            sock.sendMessage(id, { text: 'Whatsapp Online ✅' })

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
   * @returns ReturnType<typeof waSocket> | null
   */
  public get(): ReturnType<typeof waSocket> | null {
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
