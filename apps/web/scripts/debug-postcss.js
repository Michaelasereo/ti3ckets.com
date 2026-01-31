#!/usr/bin/env node
/**
 * Diagnostic script: can PostCSS process globals.css with project config?
 * Supports postcss.config.mjs (Tailwind v4) and postcss.config.cjs / .js.
 * Writes NDJSON to workspace .cursor/debug.log for hypothesis evaluation.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const LOG_PATH = path.join(__dirname, '../../../.cursor/debug.log');
const WEB_ROOT = path.join(__dirname, '..');

function writeLog(payload) {
  const line = JSON.stringify({
    ...payload,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'postcss-diagnostic',
  }) + '\n';
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line);
}

writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-check', message: 'Checking PostCSS config file', data: { cwd: process.cwd(), webRoot: WEB_ROOT } });

const postcssConfigMjs = path.join(WEB_ROOT, 'postcss.config.mjs');
const postcssConfigCjs = path.join(WEB_ROOT, 'postcss.config.cjs');
const postcssConfigJs = path.join(WEB_ROOT, 'postcss.config.js');
const postcssConfigPath = fs.existsSync(postcssConfigMjs)
  ? postcssConfigMjs
  : fs.existsSync(postcssConfigCjs)
    ? postcssConfigCjs
    : postcssConfigJs;
const globalsCssPath = path.join(WEB_ROOT, 'app', 'globals.css');

writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-exists', message: 'Config path exists', data: { postcssConfigPath, configExists: fs.existsSync(postcssConfigPath), globalsExists: fs.existsSync(globalsCssPath) } });

let configLoaded = false;
let configFormat = null;
let config = null;

async function loadConfig() {
  if (postcssConfigPath.endsWith('.mjs')) {
    try {
      const mod = await import(pathToFileURL(postcssConfigPath).href);
      config = mod.default || mod;
      configLoaded = !!config;
      configFormat = config?.plugins ? (Array.isArray(config.plugins) ? 'array' : 'object') : 'unknown';
      writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-loaded', message: 'Config loaded (mjs)', data: { configLoaded, configFormat } });
    } catch (e) {
      writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-load-error', message: 'Config load failed', data: { error: e.message, stack: e.stack } });
    }
  } else {
    try {
      config = require(postcssConfigPath);
      configLoaded = !!config;
      configFormat = Array.isArray(config?.plugins) ? 'array' : (config?.plugins && typeof config.plugins === 'object' ? 'object' : 'unknown');
      writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-loaded', message: 'Config loaded', data: { configLoaded, configFormat } });
    } catch (e) {
      writeLog({ hypothesisId: 'H1', location: 'debug-postcss.js:config-load-error', message: 'Config load failed', data: { error: e.message, stack: e.stack } });
    }
  }
}

let tailwindPluginOk = false;
let postcssOk = false;
try {
  require.resolve('@tailwindcss/postcss', { paths: [WEB_ROOT] });
  tailwindPluginOk = true;
} catch (e) {
  try {
    require.resolve('tailwindcss', { paths: [WEB_ROOT] });
    tailwindPluginOk = true;
  } catch (e2) {
    writeLog({ hypothesisId: 'H4', location: 'debug-postcss.js:plugin-resolve', message: '@tailwindcss/postcss/tailwindcss resolve failed', data: { error: e2.message } });
  }
}
try {
  require.resolve('postcss', { paths: [WEB_ROOT] });
  postcssOk = true;
} catch (e) {
  writeLog({ hypothesisId: 'H4', location: 'debug-postcss.js:postcss-resolve', message: 'postcss resolve failed', data: { error: e.message } });
}
writeLog({ hypothesisId: 'H4', location: 'debug-postcss.js:packages', message: 'Package resolve result', data: { tailwindPluginOk, postcssOk } });

(async () => {
  await loadConfig();

  writeLog({ hypothesisId: 'H3', location: 'debug-postcss.js:postcss-run-start', message: 'Running PostCSS on globals.css', data: {} });

  let postcssRunOk = false;
  let outputLength = 0;
  try {
    const postcss = require('postcss');
    const plugins = [];
    if (config?.plugins && typeof config.plugins === 'object' && !Array.isArray(config.plugins)) {
      for (const [name, opts] of Object.entries(config.plugins)) {
        const plugin = require(name);
        plugins.push(typeof plugin === 'function' ? plugin(opts ?? {}) : plugin);
      }
    } else if (Array.isArray(config?.plugins)) {
      for (const p of config.plugins) {
        if (typeof p === 'string') plugins.push(require(p)());
        else if (Array.isArray(p)) plugins.push(require(p[0])(p[1]));
        else plugins.push(p);
      }
    }
    const css = fs.readFileSync(globalsCssPath, 'utf8');
    const result = await postcss(plugins).process(css, { from: globalsCssPath });
    outputLength = (result && result.css) ? result.css.length : 0;
    postcssRunOk = outputLength > 0 && !result.css.includes('@tailwind');
    writeLog({ hypothesisId: 'H3', location: 'debug-postcss.js:postcss-run-exit', message: 'PostCSS run completed', data: { postcssRunOk, outputLength, stillHasAtTailwind: (result && result.css) ? result.css.includes('@tailwind') : null } });
  } catch (e) {
    writeLog({ hypothesisId: 'H3', location: 'debug-postcss.js:postcss-run-error', message: 'PostCSS run failed', data: { error: e.message, name: e.name, stack: e.stack } });
  }
  writeLog({ hypothesisId: 'H2', location: 'debug-postcss.js:summary', message: 'Diagnostic summary', data: { configLoaded, configFormat, tailwindPluginOk, postcssOk, postcssRunOk, outputLength } });
  process.exit(postcssRunOk ? 0 : 1);
})().catch((e) => {
  writeLog({ hypothesisId: 'H3', location: 'debug-postcss.js:top-level-error', message: 'Script error', data: { error: e.message, stack: e.stack } });
  process.exit(1);
});
