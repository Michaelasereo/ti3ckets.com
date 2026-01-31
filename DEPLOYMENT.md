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

---

## Netlify deploy

The site is configured for Netlify (root [netlify.toml](netlify.toml): build `apps/web`, publish `apps/web/.next`).

### Recommended: Deploy via Git

Push to the branch connected to your Netlify site (e.g. `main`). Netlify builds and deploys on their servers, so you avoid local upload issues:

```bash
git push origin main
```

### CLI deploy (“Uploading blobs” error)

If you run `npx netlify deploy --prod --filter=@getiickets/web` and see:

```text
Error uploading blobs to deploy store: fetch failed
```

that’s a **known Netlify CLI bug** ([GitHub #7710](https://github.com/netlify/cli/issues/7710)), not an issue with your app.

**Workarounds:**

1. **Use Git deploy** (above) so Netlify builds and deploys on their side.
2. **Retry** – sometimes the blob upload succeeds on a second or third run.
3. **Try an older CLI** – e.g. `npm install -g netlify-cli@22.0.0` then run deploy again. [CLI versions](https://ntl.fyi/cli-versions).
4. **Trigger deploy from the dashboard** – Netlify → Deploys → “Trigger deploy” → “Deploy site” (uses latest commit, no local upload).
5. **Check network** – VPN, proxy, or firewall can block the upload; try another network or disable VPN.

One-time link (if not already linked):

```bash
npx netlify link --id YOUR_SITE_ID --filter=@getiickets/web
```
