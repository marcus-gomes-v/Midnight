const _data = require(`${__dirname}/data`)
const helpers = require(`${__dirname}/helpers`)
const config = require(`${__dirname}/config`);


const handlers = {};


/*
 * HTML HANDLERS
 *
 */
// Index handler
handlers.index = (data, cb) => {
    // Reject any request thata isn't a get
    if(data.method == 'get')
    {
        // Read in a template as a string
        helpers.getTemplate('index',(err, str) => {
            if(!err && str)
            {
                cb(200, str, 'html')
            } else {
                cb(500, undefined, 'html')
            }
        })
    } else {
        cb(405, undefined, 'html')
    }
}



/*
 * JSON API HANDLERS
 *
 */
handlers.users = (data, cb) => {
    let acceptableMethods = ['post', 'put', 'get', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) 
    {
        handlers._users[data.method](data, cb);
    } else {
        cb(405);
    }
};

handlers._users = {};

handlers._users.post = (data , cb) => {
    let firstName = typeof(data.payload.firstName) == 'string' ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;
    
    if( firstName && lastName && phone && password && tosAgreement ) {
        _data.read('users', phone, (err, data) => {
            if(err) 
            {
                let hashedPassword = helpers.hash(password)

                if(hashedPassword)
                {
                    let userObj = {
                        firstName,
                        lastName,
                        phone,
                        hashedPassword,
                        tosAgreement : true 
                    }
    
                    _data.create('users', phone, userObj, err => {
                        if(!err) 
                        {
                            cb(200)
                        } else {
                            cb(500, {'Error':'Could not create the new user'})
                        }
                    })
                } else {
                    cb(500, {'Error':'Could not hash the user\'s password'})
                }
                
            } else {
                cb(400, {'Error' : 'User with that phone number already exists'})
            }
        })
    } else {
        cb(400, {'Error' : 'Missing the required fields'})
    }
}


handlers._users.get = (data , cb) => {
    //Check that the phone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' ? data.queryStringObject.phone.trim() : false;
    if(phone) 
    {
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) 
            {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if(!err && data) 
                    {
                        delete data.hashedPassword
                        cb(200, data)
                    } else {
                        cb(404)
                    }   
                })
            } else {
                cb(403, {'Error':'Missing required token in header, or token is invalid'})
            }
        })
        

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}


handlers._users.put = (data , cb) => {
    let phone = typeof(data.payload.phone) == 'string' ? data.payload.phone.trim() : false;
    let firstName = typeof(data.payload.firstName) == 'string' ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) == 'string' ? data.payload.password.trim() : false;

    if(phone) 
    {
        if(firstName || lastName || password) 
        {
             // Get the token from the headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if(tokenIsValid) 
                {
                    _data.read('users', phone, (err, userData) => {
                        if(!err && data) 
                        {
                            if(firstName) {
                                userData.firstName = firstName
                            }
                            if(lastName) {
                                userData.lastName = lastName
                            }
                            if(password) {
                                let hashedPassword = helpers.hash(password)
                                userData.hashedPassword = hashedPassword
                            } 
        
                            _data.update('users', phone, userData, err => {
                                if(!err)
                                {
                                    cb(200)
                                } else {
                                    cb(500, {'Error':'Could not update the user'})
                                }
                            })
                        } else {
                            cb(400, {'Error':'The specified user does not exist'})
                        }   
                    })
                } else {
                    cb(403, {'Error':'Missing required token in header, or token is invalid'})
                }
            })
            
        } else {
            cb(400, {'Error':'Missing fields to update'})
        }

    } else {
        cb(400, {'Error':'Missing required field'})
    }
    
}


// Check - delete
// Required data: id
// Optional data: nonde
handlers._users.delete = (data , cb) => {
    let phone = typeof(data.queryStringObject.phone) == 'string' ? data.queryStringObject.phone.trim() : false;
    if(phone) 
    {
         // Get the token from the headers
         let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

         // Verify that the given token is valid for the phone number
         handlers._tokens.verifyToken(token, phone, tokenIsValid => {
             if(tokenIsValid) 
             {
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) 
                    {
                        _data.delete('users', phone, err => {
                            if(!err) 
                            {
                                // Delete each other checks associated with the
                                let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                let checkToDelete = userChecks.length;
                                if(checkToDelete > 0)
                                {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;

                                    // Loop trought the checks
                                    userChecks.forEach(checkId => {
                                        _data.delete('checks', checkId, err => {
                                            if(err)
                                                deletionErrors = true;
                                        })
                                        checksDeleted++;
                                        if(checksDeleted == checkToDelete) {
                                            if(!deletionErrors) 
                                            {
                                                cb(200);
                                            } else {
                                                cb(500, {'Error':'Errors encountered while attempting to delete all user`s checks. All checks may not have been deleted from the system successfully'});
                                            }
                                        }
                                    });
                                } else {
                                    cb(200)
                                }
                            } else {
                                cb(500, {'Error':'Could not delete the specified user'})
                            }
                        })
                    } else {
                        cb(400, {'Error':'Could not find the specified user'})
                    }   
                })
             } else {
                 cb(403, {'Error':'Missing required token in header, or token is invalid'})
             }
         })
        

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}


handlers.tokens = (data, cb) => {
    let acceptableMethods = ['post', 'put', 'get', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) 
    {
        handlers._tokens[data.method](data, cb);
    } else {
        cb(405);
    }
};

//Container for all the tokens submethods
handlers._tokens = {};

// Tokens - post
// Require data: phone, password
// Optional data: none
handlers._tokens.post = (data, cb) => {
    let phone = typeof(data.payload.phone) == 'string' ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' ? data.payload.password.trim() : false;
    if(phone && password)
    {
        // Lookup in the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if(!err && userData) 
            {
                //Hash the password and compare to the stored password
                let hashedPassword = helpers.hash(password)
                if(hashedPassword == userData.hashedPassword)
                {
                    //If valid create a new token with a random name. Set expiration date 1(hour) in the future
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() +  1000 * 60 * 60;
                    let tokenObject = {
                        phone,
                        expires,
                        id : tokenId
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, err => {
                        if(!err)
                            cb(200, tokenObject)
                        else 
                            cb(500, {'Error':'Could not create the new token'})
                    })
                } else {
                    cb(400, {'Error':'Password did not match the specified user`s stored password'})
                }
            } else {
                cb(400, {'Error':'Could not find the specified user'})
            }
        })
    } else {
        cb(400, {'Error':'Missing required field(s)'})
    }
}

// Tokens - get
// Require data: id
// Optional data: none
handlers._tokens.get = (data, cb) => {

    //Check that id is valid
    let id = typeof(data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if(id) 
    {
        //Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) 
            {
                cb(200, tokenData)
            } else {
                cb(404)
            }   
        })

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}

// Tokens - get
// Require data: id, extend
// Optional data: none
handlers._tokens.put = (data, cb) => {
    //Check the data is valid
    let id = typeof(data.payload.id) == 'string' ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if(id && extend)
    {
        //Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData)
            {
                //Check to the make sure the token isn`t alread expired
                if(tokenData.expires > Date.now())
                {
                    //Set the experiation an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    //Store the new updates
                    _data.update('tokens', id, tokenData, err => {
                        if(!err)
                            cb(200);
                        else
                            cb(500, {'Error':'Could not update the token`s expiration'})
                    })
                } else {
                    cb(400, {'Error':'The token has already experied, and cannot be extended'})    
                }
            } else {
                cb(400, {'Error':'Specified token does not exist'})
            }
        })
    } else {
        cb(400, {'Error':'Missing required field(s) or field(s) are invalid'})
    }
}

// Tokens - delete
// Require data: id
// Optional data: none
handlers._tokens.delete = (data, cb) => {
    // Check that id is valid
    let id = typeof(data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if(id) 
    {
        //Lookup the token
        _data.read('tokens', id, (err, data) => {
            if(!err && data) 
            {
                _data.delete('tokens', id, err => {
                    if(!err) 
                    {
                        cb(200)
                    } else {
                        cb(500, {'Error':'Could not delete the specified token'})
                    }
                })
            } else {
                cb(400, {'Error':'Could not find the specified token'})
            }   
        })

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}


//Verify if the given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, cb) => {
    //Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) 
        {   
            // Check that the token is for the given user and has not pexired
            if(tokenData.phone == phone && tokenData.expires > Date.now())
            {
                cb(true)
            } else {
                cb(false)
            }
        } else {
            cb(false)
        }
    })
}


handlers.checks = (data, cb) => {
    let acceptableMethods = ['post', 'put', 'get', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) 
    {
        handlers._checks[data.method](data, cb);
    } else {
        cb(405);
    }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, methods, successCodes, timeoutSeconds
// Optinal data: none
handlers._checks.post = (data, cb) => {
    // Validate inputs
    let protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0  ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(protocol && url && method && successCodes && timeoutSeconds)
    {
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        //Lookup the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData)
            {
                let userPhone = tokenData.phone;

                //Lookup the user data
                _data.read('users', userPhone, (err, userData) => {
                    if(!err && tokenData )
                    {
                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify the user has less the number of max-checks-per-user
                        if(userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            let checkId = helpers.createRandomString(20);

                            //Create the check of object, and include the user`s phone
                            let checkObject = {
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds,
                                id: checkId
                            };

                            _data.create('checks', checkId, checkObject, err => {
                                if(!err)
                                {
                                    // Add the check id to the user`s object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, err => {
                                        if(!err)
                                        {
                                            // Return the data about the new check
                                            cb(200, checkObject);
                                        } else {
                                            cb(500, {'Error':'Could not update user with the new check'})
                                        }
                                    })
                                } else {
                                    cb(500, {'Error':'Could not create the new check'})
                                }
                            })
                        } else {
                            cb(400, {'Error':`The user already has the maximum number of checks (${config.maxChecks})`})
                        }
                    } else {
                        cb(403)
                    }
                })

            } else {
                cb(403)
            }
        })
    } else {
        cb(400, {'Error':'Missing required inputs, or inputs are invalid'})
    }

}

// Checks - get
// Required data: id,
// Optional data: none
handlers._checks.get = (data , cb) => {
    //Check that the phone number is valid
    let id = typeof(data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if(id) 
    {
        //Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData)
            {
                // Get the token from the headers
                let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                    if(tokenIsValid) 
                    {
                        // Return the check data;
                        cb(200, checkData)
                    } else {
                        cb(403, {'Error':'Missing required token in header, or token is invalid'})
                    }
                })
            } else {
                cb(404)
            }
        });

        
        

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}

// Checks - put
// Required data: id
// Optinal data: protocol, url, methods, successCodes, timeoutSeconds (one must be sended)
handlers._checks.put = (data, cb) => {
    // Check required field
    let id = typeof(data.payload.id) == 'string' ? data.payload.id.trim() : false;

    // Check optional fields
    let protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0  ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Check muke sure the id is valid
    if(id)
    {
        // Check to make sure one or more optional fields been sent
        if(protocol || url || method || successCodes || timeoutSeconds)
        {
          
            //Lookup the user data
            _data.read('checks',id, (err, checkData) => {
                if(!err && checkData)
                {
                    // Get the token from the headers
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                    // Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                        if(tokenIsValid) 
                        {
                            // Update the check where necessary 
                            checkData.protocol = protocol ? protocol : checkData.protocol;
                            checkData.url = url ? url : checkData.url;
                            checkData.method = method ? method : checkData.method;
                            checkData.successCodes = successCodes ? successCodes : checkData.successCodes;
                            checkData.timeoutSeconds = timeoutSeconds ? timeoutSeconds : checkData.timeoutSeconds;
                            
                            _data.update('checks', id, checkData, err => {
                                if(!err)
                                    cb(200);
                                else 
                                    cb(500, {'Error':'Could not update the check'})
                            })                                    
                        } else {
                            cb(403, {'Error':'Missing required token in header, or token is invalid'})
                        }
                    })
                } else {
                    cb(400, {'Error':'Check ID did not exist'})
                }
            })
        } else {
            cb(400, {'Error':'Missing fields to update'})
        }

    } else {
        cb(400, {'Error':'Missing required inputs, or inputs are invalid'})
    }

}

// Check - delete
// Required data: id
// Optional data: nonde
handlers._checks.delete = (data, cb) => {
    // Check that id is valid
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.length == 20 ? data.queryStringObject.id : false;
    if(id) 
    {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData)
            {
                // Get the token from the headers
                let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                 // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                    if(tokenIsValid) 
                    {
                        // Delete the check data
                        _data.delete('checks', id, err => {
                            if(!err)
                            {
                                // Lookup the user
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if(!err && userData)
                                    {
                                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // Remove the delete check from the list of checks
                                        let checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1) 
                                        {
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the users data
                                            _data.update('users', checkData.userPhone, userData, err => {
                                                if(!err)
                                                {
                                                    cb(200)
                                                } else {
                                                    cb(500, {'Error':'Could not update the user'})
                                                }
                                            })
                                        } else {
                                            cb(500, {'Error':'Could not find the check on the users object, so could not remove it'})
                                        }
                                    } else {
                                        cb(500, {'Error':'Could not find the user who created the check, so could not remove the check from the list o checks on the user object'})        
                                    }
                                })
                            } else {
                                cb(500, {'Error':'Could not delete the check data'})
                            }
                        })

                    } else {
                        cb(403)
                    }
                })
                
            } else {
                cb(400, {'Error':'The specified check ID does not exist'})
            }
        })

        

    } else {
        cb(400, {'Error':'Missing required field'})
    }
}


handlers.ping = (data, cb) => {
    cb(200);
};

handlers.notFound = (data, cb) => {
    cb(404);
};

module.exports = handlers;