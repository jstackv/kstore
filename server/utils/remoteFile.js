const https = require('https');
const http = require('http');

// Opens a remote file as a stream using Node's https/http modules (the same stack the
// Cloudinary SDK uses for uploads). Node's built-in fetch() can fail with a bare
// "fetch failed" on networks with flaky IPv6/DNS, so we avoid it here.
// Resolves with { statusCode, headers, stream }; follows up to 5 redirects.
const openRemoteFile = (url, redirects = 5) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { family: 4, timeout: 30000 }, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && redirects > 0) {
        res.resume();
        const next = new URL(headers.location, url).toString();
        return resolve(openRemoteFile(next, redirects - 1));
      }
      resolve({ statusCode, headers, stream: res });
    });
    req.on('timeout', () => req.destroy(new Error('Timed out connecting to file storage')));
    req.on('error', reject);
  });

module.exports = { openRemoteFile };
