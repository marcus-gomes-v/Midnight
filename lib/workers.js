/*
 * Worker-related tasks
 *
 */

// Dependencies
const _data = require(`${__dirname}/data`);
const helpers = require(`${__dirname}/helpers`);
const _logs = require(`${__dirname}/logs`);
const http = require('http');
const https = require('https');
const url = require('url');
const util = require('util');
const debug = util.debuglog('workers')


// Instantiate the worker object
const workers = {};

// Look all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
    // Fet all the checks 
    _data.list('checks', (err, checksData) => {
        if(!err && checksData && checksData.length > 0)
        {
            checksData.forEach(check => {
                // Read in the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if(!err && originalCheckData)
                    {
                        // Pass it to the check validators, and let that funcion continue or log error as needed
                        workers.validateCheckData(originalCheckData)
                    } else {
                        debug('Error: Reading one of the check`s data')
                    }
                })
            });
        } else {
            debug('Error: Could not find any checks to process')
        }
    })
}

// Sanity-check the check-data
workers.validateCheckData = originalCheckData => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : [];
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length == 11 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not bet set ( if the workers never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'; 
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0  ? originalCheckData.lastChecked : false;

    // If all the ckecs pass, pass the data along to the next step in the process
    if(originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) 
    {
        workers.performCheck(originalCheckData);
    } else {
        debug("Error: One of the checks is not properly formatted. Skipping it.")
    }
}

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = originalCheckData => {
    // Prepare the initial check outcome
    let checkOutcome = {
        error : false,
        responseCode : false
    }

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    let parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    let hostname = parsedUrl.hostname;
    let path = parsedUrl.path; // Using path and not "pathname" because we want the query string

    // Construct the request
    let requestDetails = {
        hostname,
        path,
        protocol : `${originalCheckData.protocol}:`,
        method : originalCheckData.method.toUpperCase(),
        timeout : originalCheckData.timeoutSeconds * 1000
    }

    // Instantiate the request object ( using either the http or https module )
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    let req = _moduleToUse.request(requestDetails, res => {
        // Grab the status of the sent request
        let status = res.statusCode;
        // Update the checkoutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent) 
        {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    })

    // Bind to the error event so it doesnt get thrown
    req.on('error', e => {
        // Update the checkoutcome and pass the data along
        checkOutcome.error = {
            error : true,
            value : e
        }

        if(!outcomeSent) 
        {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    })

    // Bind to the timeout event
    req.on('timeout', e => {
        // Update the checkoutcome and pass the data along
        checkOutcome.error = {
            error : true,
            value : 'timeout'
        }

        if(!outcomeSent) 
        {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    })

    // End the request
    req.end();
}

// Process the check outcome, update the check data as need, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
     
    // Decide if an alert is warranted
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    let timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, err => {
        if(!err)
        {
            // Send the new check data to the next phase in the process if needed
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
              debug('Notice: Check outcome has not changed, no alert needed')  
            }
        } else {
            debug("Error: Trhying to save updates to one of the checks")
        }
    })
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = newCheckData => {
    let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, err => {
        if(!err)
        {
            debug('Success: User was alerted to a status change in their check, via sms: ', msg);
        } else {
            debug('Error: Could not send sms alert to user who had a state change in their check');
        }
    })
}

// Private only here
workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    // Form the log data
    let logData= {
        check: originalCheckData,
        outcome : checkOutcome,
        state : state,
        alert : alertWarranted,
        time : timeOfCheck
    };

    // Convert data to a string
    let logString = JSON.stringify(logData)

    // Determine the name of the log file
    let logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName, logString, err => {
        if(!err)
            debug('Logging to file succeed');
        else 
            debug('Logging to file failed');
    })
}

//Timer to execute the worker-process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60)
}

// Rotate (compress) the files
workers.rotateLogs = () => {
    // Listing all the (non compressed) log files
    _logs.list(false, (err, logs) => {
        if(!err && logs && logs.length > 0)
        {
            logs.forEach(logFileName => {
                // Compress the name to a differente file
                let logId = logFileName.replace('.log','');
                let newFileId = `${logId}-${Date.now()}`;
                _logs.compress(logId, newFileId, err => {
                    if(!err)
                    {
                        // Truncate the log
                        _logs.truncate(logId, err => {
                            if(!err)
                            {
                                debug('Success truncating logFile')
                            } else {
                                debug('Error truncating the logFile')
                            }
                        })
                    } else {
                        debug('Error compressing one of the log files', err)
                    }
                })
            })
        } else {
            debug('Error: could not find any logs to rotate')
        }
    })
}

//Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 50 * 24)
}

// Initi script
workers.init = () => {

    // Send to console, in yellow
    // Accept string interpolation, %s replace for the next string into
    console.log('\x1b[33m%s\x1b[0m','Background workers are running');
    
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
}

// Export the module
module.exports = workers;