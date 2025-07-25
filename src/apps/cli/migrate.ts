#!/usr/bin/env node

import { createDatabaseManager, getDatabasePath } from './utils/database.js';
import { fileURLToPath } from 'url';

function runMigration() {
  console.log('Starting database migration...');
  console.log(`Database path: ${getDatabasePath()}`);

  try {
    const dbManager = createDatabaseManager();
    dbManager.migrate();
    dbManager.close();

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration();
}
