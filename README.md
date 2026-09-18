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
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Vite proxies `/api` requests to the backend (see `vite.config.js`), so no CORS config is needed in development beyond what's already in `server.js`.

## 4. API overview

All document/folder/dashboard routes require authentication (JWT via httpOnly cookie, with a `Bearer` header fallback stored in `localStorage` for environments that block third-party cookies).

**Auth**
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/change-password` | Change password |
| PUT | `/api/auth/profile` | Update name |

**Documents**
| Method | Route | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload a file (`multipart/form-data`, field `file`, optional `folderId`) |
| GET | `/api/documents` | List, with `?search=&fileType=&folderId=&sortBy=&order=` |
| GET | `/api/documents/:id` | Get one |
| GET | `/api/documents/:id/view` | Get an inline-viewable URL |
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

**Dashboard**
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Totals + 5 most recent documents |

## 5. Security notes

- Passwords are hashed with bcrypt; the auth token is a JWT stored in an httpOnly cookie.
- Every document/folder route checks `userId` ownership before reading, updating, or deleting — one user can never reach another's files, even by guessing an ID.
- Uploads are validated by MIME type and capped at 25MB (`server/middleware/upload.js`) — adjust `MAX_FILE_SIZE` there if you need more.
- Cloudinary credentials live only in `server/.env` and are never sent to the client.
- `helmet` sets standard security headers; `express-rate-limit` throttles the general API and applies a stricter limit to `/api/auth/login` and `/api/auth/register`.
- For production, set `NODE_ENV=production` (tightens cookie `secure`/`sameSite`) and serve everything over HTTPS.

## 6. Testing it end to end

1. Start both servers (steps 2–3).
2. Visit `http://localhost:5173`, register an account.
3. From the dashboard, click **Upload document**, drop in a PDF or image.
4. Go to **Documents**, create a folder, move or rename a file, try search/filter/sort.
5. Click a document to preview it (PDFs and images preview inline; other types offer a download).
6. Download a file and confirm the original filename and extension are preserved.
7. Try deleting a folder that has files in it — confirm the files and their Cloudinary assets are gone too (check your Cloudinary Media Library).

## 7. Deployment notes

- **Backend:** deploy `server/` to any Node host (Render, Railway, Fly.io, a VPS). Set the same env vars as `.env`, plus `CLIENT_URL` pointing at your deployed frontend's origin.
- **Frontend:** `npm run build` in `client/` produces a static `dist/` you can deploy to Vercel, Netlify, or any static host. Point it at your backend by updating the API base URL (currently proxied via `/api` in dev — in production, either serve the frontend from the same domain behind a reverse proxy, or set `axios`'s `baseURL` in `client/src/services/api.js` to your backend's full URL).
- **MongoDB:** use MongoDB Atlas and restrict network access to your backend's IP/region.
- **Cloudinary:** the free tier is generous enough for personal use; monitor usage in the Cloudinary dashboard.
