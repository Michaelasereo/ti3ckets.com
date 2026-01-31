#!/bin/bash
# apps/web/debug-tailwind.sh — Tailwind/PostCSS diagnostic (run from apps/web)

echo "=== Tailwind/PostCSS Debug ==="
echo ""
echo "1. Checking dependencies..."
npm list tailwindcss autoprefixer postcss 2>/dev/null || echo "Dependencies not found"

echo ""
echo "2. Checking config files..."
ls -la postcss.config.* tailwind.config.* 2>/dev/null || echo "Config files not found"

echo ""
echo "3. Checking globals.css..."
head -5 app/globals.css 2>/dev/null || echo "app/globals.css not found"

echo ""
echo "4. Checking Next.js version..."
npx next --version 2>/dev/null || echo "Next.js not found"

echo ""
echo "5. Testing PostCSS processing..."
npx postcss-cli app/globals.css --config postcss.config.cjs --output test.css 2>&1
if [ $? -eq 0 ]; then
  echo "✓ PostCSS processing works"
  rm -f test.css
else
  echo "✗ PostCSS processing failed"
fi

echo ""
echo "=== Debug Complete ==="
