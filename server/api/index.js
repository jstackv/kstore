// Vercel serverless entry point. Vercel treats any exported Express app as a
// request handler automatically - this just re-exports the app built in
// app.js so the exact same middleware/routes run here as in server.js.
module.exports = require('../app');
