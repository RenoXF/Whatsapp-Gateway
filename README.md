# Whatsapp Gateway <a href=""><img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/RenoXF/Whatsapp-Gateway"></a>

Simple whatsapp api for only send message without any authentication.


## Build from source

1. `git clone https://github.com/RenoXF/Whatsapp-Gateway.git`
2. `cd whatsapp-gateway`
3. `yarn install` or `npm install`
4. `yarn run build` or `npm run build`
5. `yarn run serve` or `npm run serve`

## Production

1. You must build this source code first
2. `yarn install --production=true` or `npm install --omit=dev`
3. `yarn run serve` or `npm run serve`
4. then, you can setup your reverse proxy web server.

## How to Send Messages to Group Chats

1. go to folder src --> controller
2. rename `ChatController.ts` into what ever you want (ChatController.backup.txt for example)
3. rename `ChatController.txt` to `ChatController.ts`
4. build

## How to Get Group ID
1. open https://web.whatsapp.com/
2. open the Group Profile
3. on your keyboard press CTRL + SHIFT + I (Developer Tools / Inspect Element)
4. go to Elements TAB
5. find value with press CTRL + F
6. type `@g.us` and then enter
7. the value must be like this `false_123456789xxx@g.us_BAE5AB1xxxx_62xxxxx@c.us`
8. Your Group ID is `123456789xxx@g.us` (just the number)

## How to Send Message
1. Scan QR Code 
    <br>
    if you use local PC. type `localhost:3000/qrcode`
    <br>
    and if you use VPS. type `(ip address):300/qrcode`
    
2. Send Message
    <br>
    if you use local PC. type `localhost:3000/sendMessage?number=(number phone or group id)&message=TEST`
    <br>
    and if you use VPS. type `(ip address):3000/sendMessage?number=(number phone or group id)&message=TEST`
