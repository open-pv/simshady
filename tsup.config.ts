import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'], // Build for commonJS and ESmodules
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['puppeteer', 'commander'],
  },
  {
    entry: { cli: 'src/headless/cli.ts' },
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    // three is a peerDependency (so library consumers dedup their own copy),
    // but the CLI is run standalone via npx/dlx where peers may not be
    // installed. Bundle three into the CLI so it is self-contained.
    noExternal: [/^three($|\/)/],
    banner: { js: '#!/usr/bin/env node' },
  },
]);
