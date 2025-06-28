import { build } from 'esbuild';

build({
  entryPoints: ['src/tui.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/tui.mjs',
  external: ['better-sqlite3', 'react-devtools-core'],
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}).catch(() => process.exit(1));