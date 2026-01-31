# Fixing the CSS / Tailwind Build Error

If you see a **Build Error** like this when running `npm run dev` or `npm run build`:

```
Failed to compile
./app/globals.css
Module parse failed: Unexpected character '@' (1:0)
> @tailwind base;
| @tailwind components;
| @tailwind utilities;
```

the bundler is treating `globals.css` as plain CSS and **not** running it through PostCSS/Tailwind. The `@tailwind` directives are Tailwind-specific and must be processed by the Tailwind PostCSS plugin.

---

## 1. Use a single PostCSS config (how we solved it before)

Next.js looks for `postcss.config.js` or `postcss.config.cjs` in the **web app root** (`apps/web/`). Having both can confuse the loader.

**Preferred (how we solved it before):** Use **`postcss.config.cjs`** with **object format** so the config loads as CommonJS reliably (see root [docs/TAILWIND_POSTCSS_BUILD_FIX.md](../../docs/TAILWIND_POSTCSS_BUILD_FIX.md)).

- **Keep:** `apps/web/postcss.config.cjs` with the format below
- **Remove:** `apps/web/postcss.config.js` if it exists (only one config)

Use this format in `postcss.config.cjs`:

```js
/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Array form is also valid (some setups prefer it):

```js
module.exports = {
  plugins: ['tailwindcss', 'autoprefixer'],
};
```

**After changing PostCSS config:** Stop the dev server, delete `.next` (and optionally `node_modules/.cache`), then run `npm run dev` again so the new config is picked up.

---

## 2. Run from the web app directory

PostCSS is resolved from the **current working directory**. If you run from the monorepo root, Next/PostCSS might not find the config.

- **From repo root:**  
  `cd apps/web && npm run dev`
- **Or:** open a terminal with `apps/web` as cwd and run `npm run dev` there.

---

## 3. Dependencies

Ensure `apps/web/package.json` has:

- **devDependencies:** `postcss`, `tailwindcss`, `autoprefixer`

Example:

```json
"devDependencies": {
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32",
  "tailwindcss": "^3.3.6"
}
```

Then install from the web app:

```bash
cd apps/web && npm install
```

---

## 4. Clear the Next.js cache

A bad or stale cache can cause CSS to be processed incorrectly.

```bash
cd apps/web
rm -rf .next node_modules/.cache
npm run dev
```

Or use the project script if you have one:

```bash
npm run clean && npm run dev
```

---

## 5. Verify Tailwind config

`apps/web/tailwind.config.js` should exist and list your content paths, for example:

```js
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
],
```

If `content` is wrong, Tailwind may not run or may not find your classes; it usually doesn’t cause the “Unexpected character '@'” error, but worth checking.

---

## Quick checklist

| Check | Action |
|-------|--------|
| Only one PostCSS config | Prefer `postcss.config.cjs` with object format; remove `postcss.config.js` if both exist |
| Config format | `plugins: { tailwindcss: {}, autoprefixer: {} }` or `plugins: ['tailwindcss', 'autoprefixer']` |
| Run from `apps/web` | `cd apps/web && npm run dev` |
| Dependencies | `postcss`, `tailwindcss`, `autoprefixer` in `devDependencies`; run `npm install` in `apps/web` |
| Cache | `rm -rf .next node_modules/.cache` then `npm run dev` |

---

## Debug script (optional)

If you have `scripts/debug-postcss.js`, you can run:

```bash
cd apps/web && npm run debug:postcss
```

to confirm PostCSS and Tailwind are loading correctly.

---

## Summary

The “Unexpected character '@'” error means **PostCSS (and thus Tailwind) is not processing `globals.css`**. Fix it by: using a single PostCSS config in `apps/web`, running dev/build from `apps/web`, having the right deps, and clearing `.next` and `node_modules/.cache` if the issue persists.
