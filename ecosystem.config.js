module.exports = {
  apps : [{
    name   : "Whatsapp Gateway Server",
    script : "./dist/server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    exec_mode: "fork",
    instances: 1,
    watch: [
      "./dist/*"
    ]
  }]
}
