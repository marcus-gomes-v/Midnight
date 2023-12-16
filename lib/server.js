/*
 * Server-related tasks
 *
 */
//server.js
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
    
    // Get the headers as an object
    const headers = req.headers;

    // FGet the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();
        
        // Choose the handler this request should got to. If one is not found, use the not found
        let choosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : server.router.notFound;

        // If the request is within the public directory, use the public handler instead
        choosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : choosenHandler;

        // Construct the data object to send to the handler
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        }

        // Route te request to the handler specified in the router
        choosenHandler(data, (statusCode, payload, contentType) => {

            // Determine the type of response (fallback to JSON)
            contentType = typeof(contentType) == 'string'? contentType : 'json';

            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            

            // Return the response parts that are content-specific
            let payloadString = '';
            if(contentType == 'json'){
                res.setHeader('content-type','application/json');
                // Use the payload called back by the handler, or default to an empty object
                payload = typeof(payload) == 'object' ? payload : {};
                // Convert the payload to a string
                payloadString = JSON.stringify(payload);
            }
            if(contentType == 'html') {
                res.setHeader('content-type','text/html');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'favicon') {
                res.setHeader('content-type','image/x-icon');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'css') {
                res.setHeader('content-type','text/css');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'png') {
                res.setHeader('content-type','image/png');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'jpg') {
                res.setHeader('content-type','image/jpeg');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'plain') {
                res.setHeader('content-type','text/plain');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }


            // Return the response-parts thata are common to all contet-types
            res.writeHead(statusCode);
            res.end(payloadString);

            // if the response is 200, print green otherwise print red
            if(statusCode == 200)
            {
                debug('\x1b[32m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
            } else {
                debug('\x1b[31m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
            }
            
        })
    });   
}

// Define a request router
server.router = {
    '' : handlers.index,
    'account/create' : handlers.accountCreate,
    'account/edit' : handlers.accountEdit,
    'account/deleted' : handlers.accountDeleted,
    'session/create' : handlers.sessionCreate,
    'session/deleted' : handlers.sessionDeleted,
    'checks/all' : handlers.checksList,
    'checks/create' : handlers.checksCreate,
    'checks/edit' : handlers.checksEdit,
    'ping' : handlers.ping,
    'notFound' : handlers.notFound,
    'api/users' : handlers.users,
    'api/tokens' : handlers.tokens,
    'api/checks' : handlers.checks,
    'favicon.ico' : handlers.favicon,
    'public' : handlers.public
}

// Init script
server.init = () => {

    // Start the HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m',`HTTP Server: localhost:${config.httpPort} mode: ${config.envName}`);
    })

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m',`SSL Server: localhost:${config.httpsPort} mode: ${config.envName}`)
    })
}


// Export the module
module.exports = server;