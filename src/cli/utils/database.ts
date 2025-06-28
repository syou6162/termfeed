import { DatabaseManager } from '../../models/database.js';

export const DEFAULT_DB_PATH = './termfeed.db';

export function getDatabasePath(): string {
  return process.env.TERMFEED_DB || DEFAULT_DB_PATH;
}

export function createDatabaseManager(): DatabaseManager {
  return new DatabaseManager(getDatabasePath());
}
