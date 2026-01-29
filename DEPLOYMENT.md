# Deployment

## Next.js standalone output (web app)

The web app uses `output: 'standalone'` in [apps/web/next.config.js](apps/web/next.config.js). When you run the standalone server in production, you must **copy static assets** into the standalone folder; otherwise CSS and JS will 404 and the page will load without styles.

### Build

```bash
cd apps/web
npm run build
```

This produces:

- `.next/standalone/` – Node server and server bundle
- `.next/static/` – CSS, JS, and other static assets
- `public/` – static files (images, fonts, etc.)

### Run standalone server with static assets

Run the server **from** the standalone directory and ensure `.next/static` and `public` are available at the paths the server expects. From the repo root after building:

```bash
cd apps/web

# Copy static assets into standalone so /_next/static/* and /public/* resolve
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Run from the standalone folder
cd .next/standalone
node server.js
```

Or from `apps/web` in one go:

```bash
cd apps/web
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
(cd .next/standalone && node server.js)
```

Set `PORT` and `HOST` as needed (e.g. `PORT=3000 node server.js`).

### Docker or CI

If you add a Dockerfile or production start script for the web app, include the copy step before starting the server, for example:

```dockerfile
# After next build
COPY --from=build .next/standalone ./
COPY --from=build .next/static ./.next/static
COPY --from=build public ./public
CMD ["node", "server.js"]
```

Without copying `.next/static` and `public`, the app will serve HTML but CSS and client JS requests will 404 and the page will appear unstyled.
