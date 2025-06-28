#!/usr/bin/env node

import { DatabaseManager } from '../models/database';

function runMigration() {
  console.log('Starting database migration...');

  try {
    const dbManager = new DatabaseManager();
    dbManager.migrate();
    dbManager.close();

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}
