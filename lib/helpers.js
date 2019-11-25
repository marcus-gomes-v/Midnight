const config = require(`${__dirname}/config`)
const crypto  = require('crypto')
const https = require('https')
const querystring = require('querystring')

const helpers = {};


helpers.hash = str => {
    if(typeof(str) == 'string' && str.length > 0)
    {
        let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = str => {
    try {
        let obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {};
    }
}


// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = stringLength => {
    stringLength = typeof(stringLength) == 'number' && stringLength > 0 ? stringLength : false;
    if(stringLength) 
    {
        // Define all of possible characters that could go into a string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        //Start the final string
        let str = '';
        for(i = 1; i <= stringLength; i++)
        {
            //Get the random character fro mthe possible characters
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            //Append this character to the final string
            str += randomCharacter;
        }

        //return the final string
        return str

    } else {
        return false;
    }
}


// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, cb) => {
    // Validate Parameters
    phone = typeof(phone) == 'string' && phone.length == 11 ? phone : false;
    msg = typeof(msg) == 'string' && msg.length > 0 && msg.length < 1600 ? msg : false;
    if(phone && msg)
    {
        // Configure the request payload
        let payload = {
            From : config.twilio.fromPhone,
            To : `+55${phone}`,
            Body : msg
        }

        //Strinigy the payload
        let stringPayload = querystring.stringify(payload)

        //Configure the request details
        let requestDetails = {
            protocol : 'https:',
            hostname : 'api.twilio.com',
            method : 'POST',
            path : `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            auth : `${config.twilio.accountSid}:${config.twilio.authToken}`,
            headers : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Lenght' : Buffer.byteLength(stringPayload)
            }
        }

        // Instantiate the request object
        let req = https.request(requestDetails, res => {
            // Grab the status of the sent request
            let status = res.statusCode;
            // Callback successfully if the request went trough
            if(status == 200 || status == 201)
            {
                cb(false)
            } else {
                cb(`Status code returned was ${status}`)
            }
        })
        
        // Bind to the error event so it doesn`t get thrown
        req.on('error', e => cb(e))

        // Add the payload
        req.write(stringPayload)

        // End the request
        req.end()

    } else {
        cb('Given the parameters were missing or invalid')
    }
}

module.exports = helpers;