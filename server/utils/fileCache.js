const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { openRemoteFile } = require('./remoteFile');

// Local disk cache of uploaded files so viewing/downloading never has to wait on the
// round trip to cloud storage. Cloudinary stays the source of truth; this is only a cache.
//
// On Vercel, every directory except /tmp is read-only, and /tmp itself is
// ephemeral (wiped between cold starts, not shared across instances) - so
// this still works as a best-effort cache there, just a much less durable
// one than on a traditional host. Nothing here assumes the cache survives.
const DIR = process.env.VERCEL ? path.join('/tmp', 'kstore-filecache') : path.join(__dirname, '..', '.filecache');
const MAX_BYTES = (process.env.VERCEL ? 200 : 500) * 1024 * 1024;

const inflight = new Map(); // id -> Promise<{ ok, statusCode?, error? }>

const filePath = (id) => path.join(DIR, String(id));
const exists = (id) => fs.existsSync(filePath(id));

const ensureDir = () => fsp.mkdir(DIR, { recursive: true });

const prune = async () => {
  try {
    const names = await fsp.readdir(DIR);
    const files = [];
    let total = 0;
    for (const name of names) {
      if (name.endsWith('.tmp')) continue;
      const stat = await fsp.stat(path.join(DIR, name));
      files.push({ name, size: stat.size, time: stat.atimeMs || stat.mtimeMs });
      total += stat.size;
    }
    files.sort((a, b) => a.time - b.time);
    while (total > MAX_BYTES && files.length > 1) {
      const oldest = files.shift();
      await fsp.unlink(path.join(DIR, oldest.name)).catch(() => {});
      total -= oldest.size;
    }
  } catch {
    /* cache housekeeping must never break a request */
  }
};

// Save a buffer we already have in memory (used right after an upload)
const save = async (id, buffer) => {
  await ensureDir();
  const tmp = `${filePath(id)}.tmp`;
  await fsp.writeFile(tmp, buffer);
  await fsp.rename(tmp, filePath(id));
  prune();
};

const remove = (id) => fsp.unlink(filePath(id)).catch(() => {});

// Make sure the file is in the cache, downloading it from storage if needed.
// Concurrent callers for the same document share one download.
const ensure = (id, url) => {
  if (exists(id)) return Promise.resolve({ ok: true });
  if (inflight.has(String(id))) return inflight.get(String(id));

  const job = (async () => {
    try {
      await ensureDir();
      const upstream = await openRemoteFile(url);
      if (upstream.statusCode !== 200) {
        upstream.stream.resume();
        return { ok: false, statusCode: upstream.statusCode };
      }
      const tmp = `${filePath(id)}.tmp`;
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(tmp);
        upstream.stream.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
        upstream.stream.pipe(out);
      });
      await fsp.rename(`${filePath(id)}.tmp`, filePath(id));
      prune();
      return { ok: true };
    } catch (err) {
      await fsp.unlink(`${filePath(id)}.tmp`).catch(() => {});
      return { ok: false, error: err };
    } finally {
      inflight.delete(String(id));
    }
  })();

  inflight.set(String(id), job);
  return job;
};

module.exports = { filePath, exists, save, remove, ensure };
