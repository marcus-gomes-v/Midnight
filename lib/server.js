/*
 * Server-related tasks
 *
 */



// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');

const config = require(`${__dirname}/config`);
const handlers = require(`${__dirname}/handlers`);
const helpers = require(`${__dirname}/helpers`);
const data = require(`${__dirname}/data`);
const path = require('path');
const util = require('util');
const debug = util.debuglog('server')

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer( (req,res) => server.unifiedServer(req,res))

server.httpsServerOptions = {
    key : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    cert : fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req,res) => server.unifiedServer(req,res))


server.unifiedServer =  (req,res) => {
    const parsedUrl = url.parse(req.url, true)
    const path  = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');
    const queryStringObject = parsedUrl.query;
    const method = req.method.toLocaleLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder('utf-8');

    let buffer = '';
    
    req.on('data', data => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();
        
        let choosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : server.router.notFound;

        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        }

        choosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            let payloadString = JSON.stringify(payload);
            res.setHeader('content-type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // if the response is 2000, print green otherwise print red
            if(statusCode == 200)
            {
                debug('\x1b[32m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
            } else {
                debug('\x1b[31m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
            }
            
        })
    });   
}

server.router = {
    'users' : handlers.users,
    'ping' : handlers.ping,
    'notFound' : handlers.notFound,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks,
}

// Init script
server.init = () => {

    // Start the HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[34m%s\x1b[0m',`HTTP Server: localhost:${config.httpPort} mode: ${config.envName}`);
    })

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m',`SSL Server: localhost:${config.httpsPort} mode: ${config.envName}`)
    })
}



// Export the module
module.exports = server;