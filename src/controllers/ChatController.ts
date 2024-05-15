import { Request, Response } from 'express'
import Whatsapp from '../libraries/Whatsapp.js'
import { queue } from '../queue.js'

class ChatController {
  public send(req: Request, res: Response) {
    const number = String(
      req.body.number || req.params.number || req.query.number,
    )
    const msg = req.body.message || req.params.message || req.query.message
    const sock = Whatsapp.get()

    if (sock == null || sock == undefined) {
      console.warn('Whatsapp Client is not connected or not available')
      return res.status(400).json({
        error: 'Whatsapp Client is not connected or not available',
      })
    }

    if (number == undefined || number == null) {
      console.error('Params number cannot be null')
      return res.status(422).json({
        error: 'Params number cannot be null',
      })
    }

    if (msg == undefined || msg == null) {
      console.error('Params message cannot be null', number)
      return res.status(422).json({
        error: 'Params message cannot be null',
      })
    }

    // const [result] = await sock.onWhatsApp(number)

    // if (!result?.exists) {
    //   return res.status(422).json({
    //     error: 'Phone number is invalid',
    //   })
    // }

    const phoneNumber =
      Buffer.from(number, 'utf8')
        .toString()
        .replace('@g.us', '')
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@broadcast', '')
        .split('@')[0] ?? null
    const msgDecoded = Buffer.from(msg, 'utf8').toString()

    if (phoneNumber == null) {
      console.error('Phone number is invalid', number)
      return res.status(422).json({
        error: 'Phone number is invalid',
      })
    }

    const jid =
      phoneNumber?.toString()?.startsWith('628') ||
      phoneNumber?.toString()?.startsWith('+62') ||
      phoneNumber?.toString()?.startsWith('0') ||
      /^(62|08|\+62)/gim.test(phoneNumber.toString())
        ? `${number}@s.whatsapp.net`
        : `${number}@g.us`

    try {
      queue.add(async () => {
        await sock.presenceSubscribe(jid)
        await sock.sendPresenceUpdate('composing', jid)
        await new Promise((resolve) => setTimeout(resolve, 150))
        await sock.sendPresenceUpdate('available', jid)

        await sock.sendMessage(jid, {
          body: msgDecoded,
          text: msgDecoded,
        })
      })
      console.log(`Successfully send message to ${jid}`)

      return res.status(200).json({
        message: 'Message has been sent',
      })
    } catch (error) {
      console.error(`Failed to send message to ${jid}`, error)
      return res.status(400).json({
        error,
      })
    }
  }
}

export default new ChatController()
