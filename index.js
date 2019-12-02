/*
 * PRIMARY FILE FOR THE API
 *
 */

 // Load Dependencies

 const server = require(`${__dirname}/lib/server`)
 const workers = require(`${__dirname}/lib/workers`)


 // Declare the App
const app = {};


// Init function
app.init = () => {
  // Start the server
  server.init()

  // Start the workers
  workers.init() 
}

 
// Execute
app.init()

// Export the app
module.exports = app;

