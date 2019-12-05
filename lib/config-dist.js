
const enviroments = {};

enviroments.staging = {
    httpPort : '3000',
    httpsPort : '3001',
    envName : 'staging',
    hashingSecret : 'thisIsASecret',
    maxChecks : 5,
    twilio : {
        accountSid : 'YOUR-TWILIO-ACCOUNTSID', 
        authToken : 'YOUR-TWILIO-AUTHTOKEN',
        fromPhone : 'YOUR-TWILIO-PHONE'
    },
    templateGlobals : {
        appName : 'ArvisLoad',
        companyName : 'Arvischain, Inc',
        yearCreated : '2019',
        baseUrl : 'https://localhost:3001'
    }
}

enviroments.production = {
    httpPort : '80',
    httpsPort : '443',
    envName : 'product',
    hashingSecret : 'thisIsAlsoASecret',
    maxChecks : 5,
    twilio : {
        accountSid : 'YOUR-TWILIO-ACCOUNTSID', 
        authToken : 'YOUR-TWILIO-AUTHTOKEN',
        fromPhone : 'YOUR-TWILIO-PHONE'
    },
    templateGlobals : {
        appName : 'ArvisLoad',
        companyName : 'Arvischain, Inc',
        yearCreated : '2019',
        baseUrl : 'https://localhost:443'
    }
}

const currentEnviroment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const enviromentsToExport = typeof(enviroments[currentEnviroment]) == 'object' ? enviroments[currentEnviroment] : enviroments.staging;

module.exports = enviromentsToExport;