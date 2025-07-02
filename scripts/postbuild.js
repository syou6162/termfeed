#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Ensure dist/models directory exists
mkdirSync(join(projectRoot, 'dist', 'models'), { recursive: true });

// Copy schema.sql to dist/models
copyFileSync(
  join(projectRoot, 'src', 'models', 'schema.sql'),
  join(projectRoot, 'dist', 'models', 'schema.sql')
);

console.log('✓ Copied schema.sql to dist/models/');