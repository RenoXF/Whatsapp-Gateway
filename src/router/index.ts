import { Router } from 'express'
import ChatController from '../controllers/ChatController.js'
import QrCodeController from '../controllers/QrCodeController.js'

const router = Router({})
router.get('/qrcode', QrCodeController.scan)
router.use('/sendMessage', ChatController.send)

export default router
