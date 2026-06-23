import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { cpSync, existsSync } from 'fs';

// Copies runtime-referenced static assets verbatim into dist/ at the SAME relative
// paths they have today. These are referenced from JS via plain runtime strings
// (e.g. `src="instructor.jpg"`, `audio/q${id}.mp3`), NOT as static imports, so Vite
// does not fingerprint or emit them — without this they'd 404 in the built site.
// CSS files referenced via <link> in the HTML <head> ARE handled by Vite directly
// (emitted as hashed assets with the link rewritten), so they are not listed here.
function copyStaticAssets() {
  const items = ['instructor.jpg', 'audio', 'transcripts', 'screenshots'];
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      for (const item of items) {
        const src = resolve(__dirname, item);
        if (existsSync(src)) {
          cpSync(src, resolve(outDir, item), { recursive: true });
        }
      }
    },
  };
}

// Multi-page Vite build.
//
// The project root IS the Vite root, so every HTML page keeps the exact same URL
// it had under the old in-browser-Babel setup (e.g. /login.html, /practice.html).
// Each page is declared as a rollup input below; Vite emits one bundled JS chunk
// per entry plus a shared React vendor chunk, and rewrites the <script> tags in the
// built HTML to point at the hashed bundles.
//
// Plain static pages with no JSX/React (privacy.html, terms.html) are still listed
// as inputs so Vite copies them verbatim into dist/ with their asset links rewritten.
//
// `@vitejs/plugin-react` defaults to the AUTOMATIC JSX runtime, so JSX compiles to
// `jsx(...)` imports from 'react/jsx-runtime' and does NOT require `React` to be in
// scope. The existing code still calls `React.useState` / `React.useEffect` etc.,
// so each JSX module imports React explicitly to keep those calls resolving.
export default defineConfig({
  root: '.',
  plugins: [react(), copyStaticAssets()],
  // `@` → src, used by the ported AI Classroom components (e.g. '@/lib/math').
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        topics: resolve(__dirname, 'topics.html'),
        practice: resolve(__dirname, 'practice.html'),
        explain: resolve(__dirname, 'explain.html'),
        classroom: resolve(__dirname, 'classroom.html'),
        account: resolve(__dirname, 'account.html'),
        tests: resolve(__dirname, 'tests.html'),
        test: resolve(__dirname, 'test.html'),
        'preview-dashboard': resolve(__dirname, 'preview-dashboard.html'),
        'preview-module': resolve(__dirname, 'preview-module.html'),
        'index-print': resolve(__dirname, 'index-print.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
  },
});
