/*
 * Library for storing and rotating logs
 *
 */
//logs.js
// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/')

// Append a string to a file. Create the file if it does not exist.
lib.append = (file, string, cb) => {
    // Open the file for appending
    fs.open(`${lib.baseDir}${file}.log`,'a', (err, fileDescriptor) => {
        if(!err && fileDescriptor)
        {
            // Append to the file and clod it
            fs.appendFile(fileDescriptor,`${string}\n`, err => {
                if(!err)
                {
                    fs.close(fileDescriptor, err => {
                        if(!err)
                            cb(false);
                        else
                            cb('Error closing file thata was being appended')
                    })
                } else {
                    cb('Error: Error appending to file')
                }
            })
        } else {
            cb('Error: Could not open file for appending')
        }
    })
};

// List all the logs, and optionally include the compressed logs
lib.list = (includeCompressedLogs, cb) => {
    fs.readdir(`${lib.baseDir}`, (err, listData) => {
        if(!err && listData) 
        {
            let trimmedFileNames = [];
            listData.forEach(fileName => {
                // Add the .log files
                if(fileName.indexOf('.log') > -1)
                {
                    trimmedFileNames.push(fileName.replace('.log',''));
                }

                // Add on the .gz files
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs)
                {
                    trimmedFileNames.push(fileName.replace('.gz.b64',''))
                }
            });
            cb(false, trimmedFileNames);
        } else {
            cb(err,listData);
        }   
    })
}


// Compress the contets of .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newFileId, cb) => {
    let sourceFile = `${logId}.log`;
    let destinationFile = `${newFileId}.gz.b64`;
    
    // Read the source files
    fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
        if(!err && inputString)
        {
            // Compress the data using gzip
            zlib.gzip(inputString, (err, buffer) => {
                if(!err && buffer)
                {
                    // Send the data to the destination file
                    fs.open(`${lib.baseDir}${destinationFile}`,'wx',(err, fileDescriptor) => {
                        if(!err && fileDescriptor)
                        {
                            // Write to the destnation file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                                if(!err)
                                {
                                    // Close the destination file
                                    fs.close(fileDescriptor, err => {
                                        if(!err)
                                        {
                                            cb(false);
                                        } else {
                                            cb(err);
                                        }
                                    })
                                } else {
                                    cb(err);
                                }
                            })

                        } else {
                            cb(err);
                        }
                    })
                } else {
                    cb(buffer);
                }
            })
        } else {
            cb(err);
        }
    })
}

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, cb) => {
    let fileName = `${fileId}.gz.b64`;
    fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
        if(!err && str)
        {
            // Decompress the data
            let inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if(!err && outputBuffer)
                {
                    // Callback
                    let str = outputBuffer.toString();
                    cb(false, str);
                } else {
                    cb(err);
                }
            })
        } else {
            cb(err);
        }
    })
}

// Truncate a log file
lib.truncate = (logId, cb) => {
    fs.truncate(`${lib.baseDir}${logId}.log`,0, err => {
        if(!err)
            cb(false);
        else
            cb(err);
    })
}

// Export the module
module.exports = lib;