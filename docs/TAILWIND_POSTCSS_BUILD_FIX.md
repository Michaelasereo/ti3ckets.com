# Tailwind / PostCSS Build Error — Cause & Fix

**For senior dev review.** Summary of the `globals.css` "Unexpected character '@'" build failure, root causes, and the working fix.

**TL;DR**  
`@tailwind` in CSS is not valid CSS. PostCSS + Tailwind must run first. We had the wrong PostCSS config format (array + `require()`), and `.js` config was ambiguous. Fix: **`postcss.config.cjs`** with **`plugins: { tailwindcss: {}, autoprefixer: {} }`** in `apps/web`.

| File | Path |
|------|------|
| PostCSS config (fix) | `apps/web/postcss.config.cjs` |
| CSS entry | `apps/web/app/globals.css` |
| Import | `apps/web/app/layout.tsx` → `import './globals.css'` |
| Tailwind config | `apps/web/tailwind.config.js` |

---

## 1. The Error

```
Build Error — Failed to compile

./app/globals.css
Module parse failed: Unexpected character '@' (1:0)
> @tailwind base;
| @tailwind components;
| @tailwind utilities;
```

- **When:** During `next build` or `next dev` when Next.js compiles CSS.
- **Where:** `app/globals.css` is imported in `app/layout.tsx` (see below). Webpack’s CSS pipeline tries to parse the file **before** PostCSS runs.

---

## 2. Root Cause

`@tailwind` directives are **Tailwind-specific**. They are not valid CSS. PostCSS + the Tailwind plugin must run first to replace them with real CSS. If PostCSS never runs (or Tailwind isn’t in the pipeline), the raw file is passed to the normal CSS parser, which chokes on `@` at position 1 → **"Unexpected character '@'"**.

So the real problem is: **PostCSS was not processing `globals.css` correctly.** That came from **PostCSS config** issues.

**Error chain:**

1. Next.js sees `.css` file with `@tailwind` directives.
2. PostCSS config not loaded properly (wrong format, wrong path, or multiple configs).
3. CSS parser treats `@tailwind` as invalid CSS.
4. Build fails with "Unexpected character '@'" / "Unknown word" error.

---

## 3. Causes in Our Setup

### 3.1 PostCSS config format (Next.js requirement)

**Wrong (array + `require()`):**

```js
// postcss.config.js — BREAKS Next.js
module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
```

Next.js uses its own PostCSS plugin handling. It expects plugin **names** (strings) as keys in an object, not functions. When we used `require()` in an array, we got:

```text
Error: A PostCSS Plugin was passed as a function using require(), 
but it must be provided as a string.
```

So Tailwind never ran → raw `@tailwind` in CSS → parse error.

**Correct (object with string keys):**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Next resolves `tailwindcss` and `autoprefixer` from `node_modules` and wires them into PostCSS. Tailwind then processes `@tailwind` correctly.

---

### 3.2 Config file extension (`.js` vs `.cjs`)

We use **`postcss.config.cjs`** instead of `postcss.config.js`.

- In some environments (monorepos, different Node versions, certain CI/build hosts), `postcss.config.js` can be loaded as ESM.
- If the config is misinterpreted (e.g. wrong module system or load failure), PostCSS may not run or may not see the plugins.
- Using **`.cjs`** forces CommonJS and avoids that ambiguity, so the config is loaded reliably.

**Avoid multiple PostCSS configs:** Do not keep a `postcss.config.js` (or similar) at the **repo root** when the Next app lives in `apps/web`. Next uses the config next to `next.config.js`. A root config can confuse tooling; delete it and use only `apps/web/postcss.config.cjs`.

---

## 4. Relevant Code

### 4.1 Entry point: CSS import

**`apps/web/app/layout.tsx`**

```tsx
import './globals.css';
// ...
```

This pulls `app/globals.css` into the Next.js bundle. That file **must** be processed by PostCSS + Tailwind.

---

### 4.2 File that triggers the parse error

**`apps/web/app/globals.css`** (first few lines)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ... rest of CSS ... */
```

If PostCSS doesn’t run, these lines are treated as plain CSS → parse error at `@`.

---

### 4.3 Working PostCSS config

**`apps/web/postcss.config.cjs`** (current, working)

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

module.exports = config;
```

- **Location:** Same directory as `next.config.js` (`apps/web`). Next looks for PostCSS config there.
- **Format:** Object with plugin names as keys. No `require()` in the config.
- **Extension:** `.cjs` for stable CommonJS loading.

---

### 4.4 Dependencies

**`apps/web/package.json`** — Tailwind stack in `devDependencies`:

```json
"devDependencies": {
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.38",
  "tailwindcss": "^3.4.0",
  ...
}
```

Tailwind config lives in **`apps/web/tailwind.config.js`**; PostCSS resolves it automatically.

---

## 5. What We Fixed

| Before | After |
|--------|--------|
| `postcss.config.js` with `plugins: [ require('tailwindcss'), ... ]` | `postcss.config.cjs` with `plugins: { tailwindcss: {}, autoprefixer: {} }` |
| Possible ESM/CJS confusion on `.js` | Explicit CommonJS via `.cjs` |

---

## 6. Verification Checklist

- [ ] **`apps/web/postcss.config.cjs`** exists with object-format `plugins: { tailwindcss: {}, autoprefixer: {} }`.
- [ ] **`apps/web/tailwind.config.js`** exists with correct `content` paths (app, pages, components, etc.).
- [ ] **`apps/web/app/globals.css`** has `@tailwind base;` / `components` / `utilities`.
- [ ] **Tailwind v3+** and **PostCSS v8+** installed in `apps/web` (or hoisted in monorepo).
- [ ] **No duplicate PostCSS config** at repo root; only `apps/web/postcss.config.cjs`.
- [ ] Build run from `apps/web` (e.g. `npm run build` in the web app).

## 7. Clear Cache

If the error returns after config changes, clear caches and rebuild:

```bash
cd apps/web
rm -rf .next node_modules/.cache
npm run build
```

Or use the app `clean` script (clears `.next` and `node_modules/.cache`), then reinstall if needed:

```bash
cd apps/web
npm run clean
npm install   # if you changed deps
npm run build
```

When caches are suspect more broadly:

```bash
npm cache clean --force
# then reinstall deps and rebuild
```

## 8. Emergency One-Liner

If you need a quick fix from `apps/web`:

```bash
echo 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }' > postcss.config.cjs
rm -rf .next node_modules/.cache
npm run dev
```

(Prefer the full `postcss.config.cjs` with JSDoc and proper structure; use this only to unblock.)

## 9. Quick Test

Visit **`/test`** after `npm run dev`. The test page uses Tailwind classes (blue heading, green text, gray box, blue button). If those styles apply, Tailwind is working.

You can also run the debug script:

```bash
cd apps/web
./debug-tailwind.sh
```

Expect "✓ PostCSS processing works" when the setup is correct. The script uses `postcss-cli` (devDependency in `apps/web`) for the PostCSS test step.

---

## 10. References

- Next.js PostCSS config: [https://nextjs.org/docs/app/api-reference/config/next-config-js/postcss](https://nextjs.org/docs/app/api-reference/config/next-config-js/postcss)
- Next.js error when using `require()` for plugins: [https://nextjs.org/docs/messages/postcss-shape](https://nextjs.org/docs/messages/postcss-shape)
- Tailwind + Next.js: [https://tailwindcss.com/docs/guides/nextjs](https://tailwindcss.com/docs/guides/nextjs)
