# AnimeVerse — private admin upload + public watch site

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and set a strong `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Install packages: `npm install`
4. Start: `npm start`
5. Open `http://localhost:3000`
6. Admin: `http://localhost:3000/admin.html`

Only the authenticated admin can call the upload/delete API. Visitors have no upload route exposed in the public UI.

## Production
Use HTTPS, a strong secret/password, persistent storage, and a reverse proxy. For a real public site, move video files to object storage/CDN rather than relying on local disk.

Only upload/stream anime that you have the legal rights or permission to use.
