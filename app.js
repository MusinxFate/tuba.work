require('dotenv').config() // load environment variables
const express = require('express')
const app = express()
const prod = process.env.PROD
const protocol = prod ? require('https'): require('http')
const port = process.env.PORT
const fs = require('fs')
const cert = prod? () => ({key: fs.readFileSync(process.env.CERT_KEY), cert: fs.readFileSync(process.env.CERT_CERT)}) : false
const server = prod ? protocol.createServer(cert(), app) : protocol.createServer(app)
const router = require('./routes')
const io_code = require('./io_code')
const session = require('express-session')
const bodyParser = require('body-parser')
const io = require('socket.io')(server)
const upio = require('up.io');

app.use(upio.router);
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(session({secret: process.env.SESSION_SECRET ,cookie: {}, resave: true, saveUninitialized: false}))
app.use(express.static('public'))
app.use(express.static('public/face-stuff/weights'))
app.set('view engine', 'ejs')
app.use('/', router)

app.use((err, req, res, next)=>{
  if(err) res.send(err);
  else next();
})

io.of('/').on('connection', io_code.chat)
io.of('/home').on('connection', io_code.home)
io.of('/player').on('connection', io_code.player)
io.of('/notes').on('connection', io_code.notes)
io.of('/chat').on('connection', io_code.chat)
io.of('/shooter').on('connection', io_code.shooter)

server.listen(port, () => console.log(`Port ${port}!`))
