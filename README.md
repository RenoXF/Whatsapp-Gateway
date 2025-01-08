# Whatsapp Gateway
<a href=""><img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/RenoXF/Whatsapp-Gateway"></a>

Simple whatsapp api for only send message without any authentication.

## Install Node JS
1. `wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`
2. `source ~/.bashrc`
3. `nvm install --lts`

## Build from source

1. `git clone https://github.com/GMDP-Developers/Whatsapp-Gateway.git`
2. `cd Whatsapp-Gateway`
3. `yarn install` or `npm install`
4. `yarn run build` or `npm run build`
5. `yarn run serve` or `npm run serve`

## Production

1. You must build this source code first
2. `yarn install --production=true` or `npm install --omit=dev`
3. `yarn run serve` or `npm run serve`
4. then, you can setup your reverse proxy web server.

## How to run script 24/7
1. `sudo apt-get install tmux`
2. `npm install -g nodemon`
3. type `tmux` in terminal to run terminal session
4. make sure you are in the directory Whatsapp-Gateway
5. run script with nodemon `nodemon start`

## How to bring back session
1. run in new terminal
2. `tmux attach -t 0`

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
    and if you use VPS. type `(ip address):3000/qrcode`
    
2. Send Message
    <br>
    if you use local PC. type `localhost:3000/sendMessage?number=(number phone or group id)&message=TEST`
    <br>
    and if you use VPS. type `(ip address):3000/sendMessage?number=(number phone or group id)&message=TEST`
