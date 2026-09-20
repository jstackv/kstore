# KStore — Personal Document Storage

A full-stack app for securely storing, viewing, and downloading personal documents from anywhere.

**Stack:** React (Vite) · Node.js / Express · MongoDB · Cloudinary · JWT auth

## Project structure

```
KStore/
├── client/     React frontend (Vite + Tailwind)
└── server/     Express API (MongoDB + Cloudinary)
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB connection string (MongoDB Atlas free tier works fine)
- A free Cloudinary account (cloudinary.com) — you'll need the Cloud Name, API Key, and API Secret from your Cloudinary dashboard

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kstore

JWT_SECRET=<generate a long random string>
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your api key>
CLOUDINARY_API_SECRET=<your api secret>
```

Generate a strong `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run the API:
```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start
```

The API runs at `http://localhost:5000`. Check it's alive at `GET /api/health`.

## 3. Frontend setup

```bash
cd client
npm install   # installs docx-preview for in-browser Word viewing
npm run dev
```

The app runs at `http://localhost:5173`. Vite proxies `/api` requests to the backend (see `vite.config.js`), so no CORS config is needed in development beyond what's already in `server.js`.

## 4. API overview

All document/folder/dashboard/admin routes require authentication (JWT via httpOnly cookie, with a `Bearer` header fallback stored in `localStorage` for environments that block third-party cookies). The `/api/public/*` routes are the one deliberate exception — see §5.

**Auth**
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/change-password` | Change password |
| PUT | `/api/auth/profile` | Update name |

There's no `/api/auth/register` — accounts are created by an admin (see **Admin** below), not by self-signup.

**Admin** (requires `role: 'admin'`, except `/bootstrap`)
| Method | Route | Description |
|---|---|---|
| POST | `/api/admin/bootstrap` | Create the first admin account. Only works while the database has zero users — see §5. |
| GET | `/api/admin/users` | List every user |
| POST | `/api/admin/users` | Create a user (`{ name, email, password, role? }`) |
| PUT | `/api/admin/users/:id` | Update a user (`{ name?, email?, role?, password? }`) |
| DELETE | `/api/admin/users/:id` | Permanently delete a user and everything they own (see §5) |

**Documents**
| Method | Route | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload a file (`multipart/form-data`, field `file`, optional `folderId`) |
| GET | `/api/documents` | List, with `?search=&fileType=&folderId=&sortBy=&order=` |
| GET | `/api/documents/:id` | Get one |
| GET | `/api/documents/:id/view` | Get the public storage URL (used by the hosted Office viewer) |
| GET | `/api/documents/:id/file` | Stream the file with `Content-Disposition: inline` for in-browser viewing |
| POST | `/api/documents/:id/warm` | Fire-and-forget: pre-fetch the file into the local cache (called on row hover) so View feels instant |
| GET | `/api/documents/:id/download` | Stream the file with its original filename |
| PUT | `/api/documents/:id` | Rename / move (`{ name, folderId }`) |
| DELETE | `/api/documents/:id` | Delete (also removes the Cloudinary asset) |

**Folders**
| Method | Route | Description |
|---|---|---|
| POST | `/api/folders` | Create (`{ name, parentFolderId }`) |
| GET | `/api/folders?parentFolderId=` | List folders at a level |
| GET | `/api/folders/:id` | Folder + its subfolders + its documents |
| PUT | `/api/folders/:id` | Rename |
| DELETE | `/api/folders/:id` | Delete recursively (subfolders, documents, and their Cloudinary assets) |
| POST | `/api/folders/:id/share` | Create (or return the existing) public share link |
| DELETE | `/api/folders/:id/share` | Revoke a folder's public link |

**Public sharing** (no authentication — see §5)
| Method | Route | Description |
|---|---|---|
| GET | `/api/public/folders/:token` | A shared folder's name + its documents |
| GET | `/api/public/documents/:token/:id/file` | Stream a shared document inline |
| GET | `/api/public/documents/:token/:id/download` | Download a shared document |

**Dashboard**
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Totals + 5 most recent documents |

## 5. Admin accounts, cascading delete, and folder sharing

**Creating the first admin.** There's no self-registration, so the very first account has to be created a different way: `POST /api/admin/bootstrap`. This route is intentionally reachable without logging in, but it's self-limiting — it only ever does anything while the database has zero users, so it becomes permanently inert the moment the first admin exists. Run it once:

```bash
curl -X POST http://localhost:5000/api/admin/bootstrap
# or, once deployed:
curl -X POST https://your-backend.vercel.app/api/admin/bootstrap
```

It creates an admin using `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` from your `.env` (see `server/.env.example`), defaulting to:

- **Email:** `admin@kstore.app`
- **Password:** `Admin@KStore2026!`

**Log in with those credentials and change the password immediately** (Profile → Change password) — this default is a placeholder meant to be replaced, not a real credential to keep using. Every other account from here on is created by an admin, from **Users** in the sidebar (`/admin/users`) — self-registration is gone entirely.

**Deleting a user is permanent and total.** From `/admin/users`, deleting someone removes their account, every document they own (Cloudinary asset and all), and every folder they own — nothing is soft-deleted or recoverable. An admin can't delete or demote their own account, which is the one guardrail in place against accidental lockout.

**Folder sharing.** The link icon on any folder (in the grid/list, or in a folder's own header once you're inside it) creates a random share token and copies a public link (`/share/:token`) to your clipboard — clicking it again just copies the same link rather than creating a new one. Anyone with that link can view and download the documents in that one folder without logging in; they can't navigate to any other folder or document, and the token is checked fresh on every single request rather than cached client-side. There's currently no "revoke" button in the UI, but `DELETE /api/folders/:id/share` does it if you need it (the folder itself is untouched — only the link stops working).

## 6. Security notes

- Passwords are hashed with bcrypt; the auth token is a JWT stored in an httpOnly cookie.
- Every document/folder route checks `userId` ownership before reading, updating, or deleting — one user can never reach another's files, even by guessing an ID. The `/api/public/*` routes are the intentional exception, scoped strictly by share token instead (see §5).
- Admin routes check `role === 'admin'` on every request via `requireAdmin` middleware — a regular user hitting an admin URL directly gets a 403, not a UI-only block.
- Uploads are validated by MIME type and capped at 25MB (`server/middleware/upload.js`) — adjust `MAX_FILE_SIZE` there if you need more (note the 4.5MB Vercel limit in §8 if you're deploying there).
- Cloudinary credentials live only in `server/.env` and are never sent to the client.
- `helmet` sets standard security headers; `express-rate-limit` throttles the general API and applies a stricter limit to `/api/auth/login` and `/api/admin/bootstrap`.
- For production, set `NODE_ENV=production` (tightens cookie `secure`/`sameSite`) and serve everything over HTTPS.
- The server keeps a local disk cache of file bytes at `server/.filecache/` (capped at ~500MB, oldest files evicted first) so viewing/downloading doesn't wait on Cloudinary every time. It's already in `.gitignore`; delete it any time to reclaim space, it's rebuilt on demand.

## 7. Testing it end to end

1. Start both servers (steps 2–3).
2. Bootstrap the first admin (see §5), then log in with those credentials at `http://localhost:5173` and change the password.
3. Go to **Users**, create a second (regular) account, then log in as them in a private/incognito window to confirm they can't reach `/admin/users`.
4. As either user: from the dashboard, click **Upload document**, drop in a PDF or image.
5. Go to **Documents**, create a folder, move or rename a file, try search/filter/sort.
6. Click **View** on a document to open it in the browser without downloading: PDFs and images render natively, `.docx` is rendered in-page, and `.doc/.xls(x)/.ppt(x)` open in the embedded Microsoft Office viewer.
7. Download a file and confirm the original filename and extension are preserved.
8. Click the link icon on a folder, then open the copied link in a private/incognito window — confirm you can view and download those documents without logging in, and that the link does *not* let you reach any other folder.
9. Back in the admin's Users page, delete the test account you made in step 3 — confirm its documents disappear from Cloudinary's Media Library too.

## 8. Deploying to Vercel

KStore deploys to Vercel as **two separate projects** — one for `server/`, one for `client/` — both from the same repo. This is the standard, supported way to run an Express API on Vercel (as a serverless function) alongside a Vite frontend.

### Before you start

Vercel's serverless functions have a **hard 4.5MB request body limit** that can't be raised, even on paid plans. The app's own upload limit is 25MB (`server/middleware/upload.js` → `MAX_FILE_SIZE`), so **uploads over 4.5MB will fail on Vercel specifically**, even though they'd work fine on Render/Railway/a VPS. If that matters to you, either lower `MAX_FILE_SIZE` to something under 4.5MB before deploying, or host `server/` on a traditional Node host instead and use Vercel only for `client/` (steps below work the same either way — just point `VITE_API_URL` at wherever the backend actually lives).

The local file cache (`server/utils/fileCache.js`) still works on Vercel but is much less effective there: it writes to `/tmp`, which Vercel wipes between cold starts and doesn't share across instances. Functionally this is invisible (everything still works, it just falls back to fetching from Cloudinary more often than on a traditional host).

You'll need a [Vercel account](https://vercel.com) with the repo pushed to GitHub/GitLab/Bitbucket (Vercel deploys from a connected git repo), plus the MongoDB Atlas and Cloudinary credentials from step 1.

### Step 1 — Deploy the backend (`server/`)

1. In the Vercel dashboard, click **Add New → Project**, import this repo.
2. When asked for the **Root Directory**, set it to `server`.
3. Framework Preset: leave as **Other** (Vercel will pick up `server/vercel.json`, which routes every request to `server/api/index.js`).
4. Under **Environment Variables**, add everything from `server/.env.example`:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = a long random string (generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `JWT_EXPIRES_IN` = `7d`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optional — override the bootstrap defaults; see §5)
   - `CLIENT_URL` — you don't know the frontend's URL yet, so put in a placeholder like `https://placeholder.vercel.app` for now; you'll fix this in step 3.
5. Click **Deploy**. Once it finishes, copy the project's URL (something like `https://kstore-api.vercel.app`) — you'll need it next. Visit `https://<that-url>/api/health` and confirm you get back `{"success":true,...}`.

### Step 2 — Deploy the frontend (`client/`)

1. **Add New → Project** again, same repo, this time set **Root Directory** to `client`.
2. Framework Preset: Vercel should auto-detect **Vite**. Build command `npm run build`, output directory `dist` (defaults are correct).
3. Under **Environment Variables**, add:
   - `VITE_API_URL` = the backend URL from step 1 (e.g. `https://kstore-api.vercel.app`, **no trailing slash**)
4. Click **Deploy**. Copy this project's URL too (e.g. `https://kstore.vercel.app`).

### Step 3 — Connect them

1. Back in the **backend** project's Vercel settings → Environment Variables, update `CLIENT_URL` to the real frontend URL from step 2 (exact origin, no trailing slash).
2. Redeploy the backend (Vercel → Deployments → ⋯ → Redeploy) so it picks up the new value — CORS and cookies both depend on this being correct.
3. Open the frontend URL. Bootstrap the first admin (`curl -X POST https://your-backend.vercel.app/api/admin/bootstrap` — see §5), log in with those credentials, and try uploading a file to confirm everything's wired up end to end.

### Notes specific to this setup

- Cookies work cross-origin here because `server/controllers/authController.js` already sets `sameSite: 'none', secure: true` whenever `NODE_ENV=production` — that's what makes auth work with the frontend and backend on different domains.
- Every push to your repo's main branch redeploys both projects automatically; pushes to other branches get their own preview URLs (useful for testing, but remember `CLIENT_URL`/`VITE_API_URL` are pinned to the production URLs above, so previews will hit CORS errors unless you set preview-specific env vars in Vercel).
- MongoDB Atlas: make sure Network Access allows `0.0.0.0/0` (or Vercel's IP ranges) — Vercel serverless functions don't have a fixed IP, so an IP allowlist restricted to a single address won't work.
- If you'd rather keep the backend off Vercel (e.g. to avoid the 4.5MB upload limit), skip Step 1 and deploy `server/` to Render/Railway/Fly.io instead — Step 2 and 3 work identically, just point `VITE_API_URL` and `CLIENT_URL` at that host's URL instead of a Vercel one.
