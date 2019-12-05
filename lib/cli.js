/*
 * CLI-Related Tasks
 *
 */

// Dependencies
const readline = require('readline');
const util = require('util')
const debug = util.debuglog('cli')
const events = require('events')
class _events extends events{}
const e = new _events() // Conventing nodeJs recomends to interect with events class
const os = require('os')
const v8 = require('v8')
const _data = require('./data')
const _logs = require('./logs')
const helpers = require('./helpers');

// Instantiate the CLI module object
const cli = {}

// Input Handlers
e.on('man', str => {
    cli.responders.help()
})

e.on('help', str => {
    cli.responders.help()
})

e.on('exit', str => {
    cli.responders.exit()
})

e.on('stats', str => {
    cli.responders.stats()
})

e.on('list users', str => {
    cli.responders.listUsers()
})

e.on('more user info', str => {
    cli.responders.moreUserInfo(str)
})

e.on('list checks', str => {
    cli.responders.listChecks(str)
})

e.on('more check info', str => {
    cli.responders.moreCheckInfo(str)
})

e.on('list logs', str => {
    cli.responders.listLogs()
})

e.on('more log info', str => {
    cli.responders.moreLogInfo(str)
})

// Responders object
cli.responders = {}

// Help / Man
cli.responders.help = () => {
    let commands = {
        'exit' : 'Kill the CLI (and the rest of the application',    
        'man' : 'Show this help page',
        'help' : 'Alias of the "man"command',
        'stats' : 'Get statistics on the underlying operation system and resource utilizations',
        'list users' : 'Show a list of all registered (undeleted) users in the system',
        'more user info --{userId}' : 'Show details of a specific user',
        'list checks --up --down' : 'Show a list of all the active checks in the system, including hteir state, The "--up" and "--down  flgas are both optional',
        'more check info --{checkId}' : 'Show details of a specified check',
        'list logs' : 'Show a list of all the log files availabble to be read (compressed only)',
        'more log info --{fileName}' : 'Show details of a specified log file ',
    }

    // Show a header for the help page that is as wide as the screen
    cli.horizontalLine()
    cli.centered('MIDNIGHT CLI MANUAL')
    cli.horizontalLine()
    cli.verticalSpace(2)

    // Show each command, followed by its explanation, in white and yellow respectively
    for(const key in commands)
    {
        if(commands.hasOwnProperty(key))
        {
            let value = commands[key]
            let line = `\x1b[34m${key}\x1b[35m`
            let padding = 60 - line.length;
            for(i = 0; i < padding; i++)
            {
                line += ' '
            }
            line += value
            console.log(line)
            cli.verticalSpace()
        }
    }

    cli.verticalSpace(1)

    // End another horizontaline
    cli.horizontalLine()
}

//
cli.responders.stats = () => {
    // Compile an object of stats
    let stats = {
        'Load Average' : os.loadavg().join(' '),
        'CPU Count' : os.cpus().length,
        'Free Memory' : os.freemem(),
        'Current Malloced Memory' : v8.getHeapStatistics().malloced_memory,
        'Peak Malloced Memory' : v8.getHeapStatistics().peak_malloced_memory,
        'Allocated Heap Used (%)' : Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
        'Available Heap Allocated (%)' : Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
        'Uptime' : `${os.uptime()} seconds`,
    }

    // Create header of the stats
    cli.horizontalLine()
    cli.centered('SYSTEM STATICS')
    cli.horizontalLine()
    cli.verticalSpace(2)

    
    for(const key in stats)
    {
        if(stats.hasOwnProperty(key))
        {
            let value = stats[key]
            let line = `\x1b[33m${key}\x1b[0m`
            let padding = 60 - line.length;
            for(i = 0; i < padding; i++)
            {
                line += ' '
            }
            line += value
            console.log(line)
            cli.verticalSpace()
        }
    }

}

//
cli.responders.listUsers = () => {
    _data.list('users', (err, userIds) => {
        if(!err && userIds && userIds.length > 0)
        {
            cli.verticalSpace();
            userIds.forEach(userId => {
                _data.read('users', userId, (err, userData) => {
                    let line = `Name: ${userData.firstName} ${userData.lastName} Phone: ${userData.phone} Checks: `
                    let numberOfChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
                    line += numberOfChecks
                    console.log(line)
                    cli.verticalSpace()
                })
            });
        }
    })
}

//
cli.responders.moreUserInfo = (str) => {

    // Get te ID from the string
    let arr = str.split('--')
    let userId = typeof(arr[1]) == 'string' &&  arr[1].length > 0 ? arr[1] : false
    if(userId) {
        // Lookup the user
        _data.read('users', userId, (err, userData) => {
            if(!err && userData) 
            {
                // Remove the hashed password
                delete userData.hashedPassword;

                // Print the JSON with text highlighting
                cli.verticalSpace()
                console.dir(userData, {'colors': true})
                cli.verticalSpace()

            }
        })
    }
    console.log("You asked for moreUserInfo", str)
}

//
cli.responders.listChecks = (str) => {
    _data.list('checks', (err, checksIds) => {
        if(!err && checksIds && checksIds.length > 0)
        {
            cli.verticalSpace();
            checksIds.forEach(checkId => {
                _data.read('checks', checkId, (err, checkData) => {
                    let includeCheck = false
                    let lowerString = str.toLowerCase()

                    // Get tghe state, default to down
                    let state = typeof(checkData.state) == 'string' ? checkData.state : 'down';

                    // Get the state, default to iunknown
                    let stateOrUnknown = typeof(checkData.state) == 'string' ? checkData.state : 'unknown';

                    //If the user has specified the state, or hasn`t specified any state, include the current check accordinly
                    if(lowerString.indexOf(`--${state}`) > -1 || (lowerString.indexOf('--down') == -1 && lowerString.indexOf('--up') == -1))
                    {
                        let line = `ID: ${checkData.id} ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} State: ${stateOrUnknown}`
                        console.log(line)
                        cli.verticalSpace()
                    }
                })
            })
        }
    });
}

//
cli.responders.moreCheckInfo = (str) => {
    // Get te ID from the string
    let arr = str.split('--')
    let checkId = typeof(arr[1]) == 'string' &&  arr[1].length > 0 ? arr[1] : false
    if(checkId) {
         // Lookup the user
         _data.read('checks', checkId, (err, checkData) => {
             if(!err && checkData) 
             {
                 // Print the JSON with text highlighting
                 cli.verticalSpace()
                 console.dir(checkData, {'colors': true})
                 cli.verticalSpace()
 
             }
         })
    }
}

//
cli.responders.listLogs = () => {
    _logs.list(true, (err, logFileNames) => {
        if(!err && logFileNames && logFileNames.length > 0)
        {
            cli.verticalSpace()
            logFileNames.forEach(logFileName => {
                if(logFileName.indexOf('-') > -1)
                {
                    console.log(logFileName);
                    cli.verticalSpace();
                }
            })
        }
    })
}

//
cli.responders.moreLogInfo = str => {
    // Get te ID from the string
    let arr = str.split('--')
    let logFileName = typeof(arr[1]) == 'string' &&  arr[1].length > 0 ? arr[1] : false
    if(logFileName) {
        cli.verticalSpace()
        // Decompress the log
        _logs.decompress(logFileName, (err, strData) => {
            if(!err && strData)
            {
                // Split into lines
                let arr = strData.split('\n');
                arr.forEach(jsonString => {
                    logObject = helpers.parseJsonToObject(jsonString)
                    if(logObject && JSON.stringify(logObject) !== '{}')
                    {
                        console.dir(logObject, {'colors':true})
                        cli.verticalSpace()
                    }
                })
            }
        })
    }
}

// Create a vertical space
cli.verticalSpace = lines => {
    lines = typeof(lines) == 'number' && lines > 0 ? lines : 1;
    for( i = 0; i < lines; i++)
    {
        console.log('')
    }
}

// Crewate a horizontal line across the scren
cli.horizontalLine = () => {
    // Get the avaiulable screen size
    let width = process.stdout.columns;

    let line = '\x1b[0m'
    for(i = 0; i< width; i++)
    {
        line += '-'
    }
    console.log(line)
}

// Create centered text on the screen
cli.centered = str => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';

    // Get availabe screen size
    let wide = process.stdout.columns;

    /// Calcuylate the left padding there should be
    leftPadding = Math.floor((wide - str.length) / 2)

    // Put in left padded spaces before the string itself
    let line = ''
    for(i = 0; i < leftPadding; i++) {
        line += ' '
    }
    line += str
    console.log(line)
}

// Exit
cli.responders.exit = () => {
    process.exit(0)
}

// Input processos
cli.processInput = str => {
    str = typeof(str) == 'string' && str.length > 0 ? str.trim() : false;
    // Only process the if the user actualluy wrote something. Otherwise ignore
    if(str) {
        // Codify the unique strings that identify the unique questions allowed to be asked
        let uniqueInputs = [
            'man',
            'help',
            'exit',
            'stats',
            'list users',
            'more user info',
            'list checks',
            'more check info',
            'list logs',
            'more log info'
        ]

        // Got through the possible inputs, emit an event when a match is found
        let matchFound = false;
        let counter = 0;
        uniqueInputs.some(input => {
            if(str.toLowerCase().indexOf(input) > -1)
            {
                matchFound = true;
                // Emit an event matchin the unique input, and include the full string given by the user
                e.emit(input,str)
                return true;
            }
        })

        // If not match is found, tell the user to try again
        if(!matchFound){
            console.log('\x1b[41m%s\x1b[0m',`(⌐⊙_⊙) Sorry, try again`)
        }
    }
}

// Init scrit
cli.init = () => {
    // Send the start message to the console. in dark blue
    console.log('\x1b[34m%s\x1b[0m',`the CLI is running`);

    // Start teh inferface
    const _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt : '─=≡Σ((( つ◕-◕)つ '
    })

    // Create an initial prompt
    _interface.prompt()

    // Handle eachg line of input separately
    _interface.on('line', str => {
        // Send to the input processor
        cli.processInput(str)

        // Re-initialize the prompt afterards
        _interface.prompt()
    })

    // If the user stops the CLI, kill the associated process
    _interface.on('close', () => {
        process.exit(0)
    })

}



module.exports = cli