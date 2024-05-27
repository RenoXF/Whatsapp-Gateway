import { Request, Response } from 'express'
import Whatsapp from '../libraries/Whatsapp.js'
import { queue } from '../queue.js'
import { cache } from '../cache.js'
import wa, { BufferJSON } from '@whiskeysockets/baileys'
import { bqueue } from '../queue.js'
const { proto } = wa

class ChatController {
  public async send(req: Request, res: Response) {
    console.log('new request')
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
        .replace(/\D/g, '')
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
        ? `${phoneNumber}@s.whatsapp.net`
        : `${phoneNumber}@g.us`

    bqueue
      .createJob({
        jid,
        message: msgDecoded,
      })
      .save()

    // await queue.add(async () => {
    try {
      await sock.presenceSubscribe(jid)
      await sock.sendPresenceUpdate('composing', jid)
      await new Promise((resolve) => setTimeout(resolve, 75))
      await sock.sendPresenceUpdate('available', jid)

      const res = await sock.sendMessage(jid, {
        body: msgDecoded,
        text: msgDecoded,
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
        .catch(() => console.error(`Failed to save message to cache ${jid}`))
    } catch (error) {
      console.error(`Failed to send message to ${jid}`, error)
      return res.status(400).json({
        error,
      })
    }
    // })

    return res.status(200).json({
      message: 'Message has been sent',
    })
  }
}

export default new ChatController()
