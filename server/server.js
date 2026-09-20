// Traditional-server entry point - used for local development and for any
// host that runs a long-lived Node process (Render, Railway, Fly.io, a VPS).
// Vercel does not use this file: it calls api/index.js instead, which
// exports the same Express app (app.js) as a serverless function.
const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`KStore server running on port ${PORT}`));
