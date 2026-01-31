# Fixing “Failed to compile” / “Unexpected character '@'” (Tailwind CSS)

If you see:

- **Build Error** → “Failed to compile”
- **File:** `./app/globals.css`
- **Message:** `Module parse failed: Unexpected character '@' (1:0)` with `@tailwind base;` etc.

→ **PostCSS/Tailwind is not processing your CSS.**

**Full step-by-step guide:** [docs/CSS-TAILWIND-TROUBLESHOOTING.md](./docs/CSS-TAILWIND-TROUBLESHOOTING.md)

**Quick fixes (how we solved it before):**

1. **Use `postcss.config.cjs`** – In `apps/web`, use **only** `postcss.config.cjs` (not `.js`) with **object format** so PostCSS loads reliably (see [docs/TAILWIND_POSTCSS_BUILD_FIX.md](../../docs/TAILWIND_POSTCSS_BUILD_FIX.md)):
   ```js
   module.exports = {
     plugins: { tailwindcss: {}, autoprefixer: {} },
   };
   ```
   Save as `apps/web/postcss.config.cjs`. Remove `postcss.config.js` if present (one config only).
2. **Run from web app** – `cd apps/web && npm run dev`
3. **Clear cache** – `rm -rf .next node_modules/.cache` then `npm run dev` again

See the full doc for dependencies, Tailwind config, and optional debug steps.
