//helpers.js
const config = require(`${__dirname}/config`)
const crypto  = require('crypto')
const https = require('https')
const querystring = require('querystring')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process');
 
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

helpers.generateSSL = (callback) => {
  const basePath = path.join(__dirname, '../https/');
  const command = `openssl req -nodes -new -x509 -keyout "${basePath}key.pem" -out "${basePath}cert.pem" -days 365 -subj "/C=PL/ST=Wielkopolski/L=Poznan/O=Midnight/OU=MD/CN=midnight.com"`;

  exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
    if (error) {
      return callback(error);
    }
    callback(null, 'SSL certificates generated successfully.');
  });
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

// Get the string content of a template
helpers.getTemplate = (templateName, data, cb) => {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};

    if(templateName)
    {
        let templatesDir = path.join(__dirname, '/../templates/')
        fs.readFile(`${templatesDir}${templateName}.html`,'utf8', (err, str) => {
            if(!err && str && str.length > 0) 
            {
                // Do interpolation on the string
                let finalString = helpers.interpolate(str, data);
                cb(false, finalString)
            } else {
                cb('No template could be found')
            }
        })
    } else {
        cb('A valid template name was note specified')
    }
};

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = (str, data, cb) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    // Get the Header
    helpers.getTemplate('_header', data, (err, headerString) => {
        if(!err && headerString)
        {
            //Get the footer
            helpers.getTemplate('_footer', data, (err, footerString) => {
                if(!err && footerString)
                {
                    let fullString = `${headerString}${str}${footerString}`;
                    cb(false, fullString);
                } else {
                    cb('Could not find the header template')
                }
            })
        } else {
            cb('Could not find the header template')
        }
    })
}


// Take a fiven string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    // Add the templateGlobals do the data object, prepend their key name with "globals"
    for(let keyName in config.templateGlobals) 
    {
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data[`global.${keyName}`] = config.templateGlobals[keyName];
        }
    }

    // For each key in the data object, insert its value into the string ant the corresponding placeholder
    for(let key in data) 
    {
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string')
        {
            let replace = data[key];
            let find = `{${key}}`;
            str = str.replace(find, replace)
        }
    }
    return str;
}


// Get the contents of a satic (public) asset
helpers.getStaticAsset = (fileName, cb) => {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if(fileName)
    {
        let publicDir = path.join(__dirname, '/../public/');
        fs.readFile(`${publicDir}${fileName}`,(err, data) => {
            if(!err && data)
            {
                cb(false, data)
            } else {
                cb('No file could be found')
            }
        })
    } else {
        cb('A valid file name was not specified')
    }
}

module.exports = helpers;