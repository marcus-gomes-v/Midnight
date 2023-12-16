//data.js
const fs = require('fs');
const path = require('path');

const helpers = require(`${__dirname}/helpers`);

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/')

lib.create = (dir, file, data, cb) => {
    let fullFilePath = `${lib.baseDir}${dir}/${file}.json`
    fs.open(fullFilePath, 'wx', (err, fileDescriptor) => {
        if(!err && fileDescriptor)
        {
            var stringData = JSON.stringify(data)
            fs.writeFile(fileDescriptor, stringData, err => {
                if(!err){
                    fs.close(fileDescriptor, err => {
                        if(!err){
                            cb(false)
                        } else {
                            cb('Error closing new file.')
                        }
                    })
                } else {
                    cb('Error writing to a new file.')
                }
            })
        } else {
            cb('Could not create new file, it may already exist.')
        }
    })
};

lib.read = (dir, file, cb) => {
    let fullFilePath = `${lib.baseDir}${dir}/${file}.json`
    fs.readFile(fullFilePath, 'utf8', (err, data) => {
        if(!err && data) 
        {
            let parsedData = helpers.parseJsonToObject(data)
            cb(false, parsedData)
        } else {
            cb(err, data)
        }
    }) 
};

lib.update = (dir, file, data, cb) => {
    let fullFilePath = `${lib.baseDir}${dir}/${file}.json`
    fs.open(fullFilePath, 'r+', (err, fileDescriptor) => {
        if(!err && fileDescriptor)
        {
            var stringData = JSON.stringify(data)
            fs.ftruncate(fileDescriptor, err => {
                if(!err)
                {
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if(!err)
                        {
                            fs.close(fileDescriptor, err => {
                                if(!err)
                                {
                                    cb(false)
                                } else {
                                    cb('Error closing existing file.')
                                }
                            })
                        } else {
                            cb('Error writing to existing file.')
                        }
                    })
                } else {
                    cb('Error truncating file.')
                }
            })
            
        } else {
            cb('Could not open the file for updating, it may not exist yet')
        }
    })
};

lib.delete = (dir, file, cb) => {
    let fullFilePath = `${lib.baseDir}${dir}/${file}.json`
    fs.unlink(fullFilePath, err => {
        if(!err)
        {
            cb(false)
        } else {
            cb('Error deleting file')
        }
    })
}

// Lit all the items in a directory
lib.list = (dir, cb) => {
    fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
        if(!err && data && data.length > 0)
        {
            let trimmedFileNames = [];
            data.forEach(filename => {
                trimmedFileNames.push(filename.replace('.json',''));
            });
            cb(false, trimmedFileNames);
        } else {
            cb(err, data);
        }
    })
}

module.exports = lib;