/**
 * Created by anthony on 01/09/2017.
 */
const http = require('http')
const WebSocketServer = require('websocket').server;

// Serve up public/ftp folder
const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express()

app.set('view engine', 'ejs')
app.use(logger('":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

const IS_PROD = process.env.NODE_ENV === 'production'

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'))
});

app.use(express.static(path.join(__dirname, '../')))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;

const server = http.createServer(app)
// Listen
server.listen(11616)

function requireClean(moduleName) {
    delete require.cache[require.resolve(moduleName)]
    return require(moduleName)
}

const _ = require('lodash')

class WebSocketHandler{
    
    constructor(connection){
        this.conn = connection
        this.conn.on('message', this.onMessage.bind(this))
        this.conn.on('close', this.onClose.bind(this))
        
        let message = require('./message')
        this.msgHandler = new message.MessageHandler()
        this.constructor.HANDLERS[Math.random()] = this
    }
    
    reloadHandler(){
        let message = requireClean('./message')
        this.msgHandler = new message.MessageHandler()
    }
    
    onMessage(message){
        if (message.type !== 'utf8') throw new Error(`unsupported message type: ${message.type}`)
        let msg = JSON.parse(message.utf8Data)
        let topic = msg.topic
        
        console.log('Received Message: ' + message.utf8Data);
        
        if(!IS_PROD) this.reloadHandler()
        
        let handlerFunc = this.msgHandler.topicMap[topic]
        let response
        
        if(handlerFunc){
            response = handlerFunc(this, message)
        }else{
            response = {error: {description:`Topic not found: ${topic}`}, data:message}
        }
        
        this.send(response)
    }
    
    send(data){
        this.conn.sendUTF(JSON.stringify(data), (error) => {
            if(error){
                console.error(error)
            }else{
                console.log('message sent:', data)
            }
        })
    }
    
    onClose(reasonCode, description){
        console.log((new Date()) + ' Peer ' + this.conn.remoteAddress + ' disconnected.');
    }
    
    static handlers(){
        return this.HANDLERS
    }
}

WebSocketHandler.HANDLERS = {}

wsServer = new WebSocketServer({httpServer: server, autoAcceptConnections: false});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    console.dir(request.resourceURL)
    
    const connection = request.accept('echo-protocol', request.origin);
    
    connection._resourceURL = request.resourceURL
    console.log((new Date()) + ' Connection accepted.');
    new WebSocketHandler(connection)
});