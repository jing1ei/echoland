import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* ------------------------------------------------------------
   __GM__ — the compile-time switch for the GM layer

   The dev-only cheat panel (src/gm/) must never ride along in a
   release build: not as a chunk, not as a dead branch, not as a string
   in the bundle. So its existence is decided here, at build time, and
   folded into a literal `false` for production. Rollup then drops the
   `import('./gm/GmLayer')` behind it and no GM chunk is emitted at all
   — you can verify with `ls dist/assets | grep -i gm` (nothing).

     npm run dev              GM on   (dev server)
     npm run build            GM OFF  (this is what ships)
     npm run build:gm         GM on   (a build you can hand to a tester)

   Deleting src/gm/ and the block in src/App.tsx removes the feature
   outright; this define may then be deleted too. See docs/GM.md.
   ------------------------------------------------------------ */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  define: {
    __GM__: JSON.stringify(mode !== 'production' || process.env.VITE_GM === '1'),
  },
  server: { host: '0.0.0.0', port: 5173 },
  build: { outDir: 'dist', assetsDir: 'assets' },
}));
