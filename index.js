/*
 * PRIMARY FILE FOR THE API
 *
 */

 // Load Dependencies

 const server = require(`${__dirname}/lib/server`)
 const workers = require(`${__dirname}/lib/workers`)
 const cli = require(`${__dirname}/lib/cli`)


 // Declare the App
const app = {};


// Init function
app.init = () => {
  // Start the server
  server.init()

  // Start the workers
  workers.init() 

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
  }, 50);
}

 
// Execute
app.init()

// Export the app
module.exports = app;

