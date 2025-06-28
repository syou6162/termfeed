import { DatabaseManager } from '../../models/database.js';
import * as path from 'path';
import * as os from 'os';

export function getDefaultDbPath(): string {
  // XDG Base Directory specificationに従う
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  const dataDir = path.join(xdgDataHome, 'termfeed');
  return path.join(dataDir, 'termfeed.db');
}

export const DEFAULT_DB_PATH = getDefaultDbPath();

export function getDatabasePath(): string {
  return process.env.TERMFEED_DB || DEFAULT_DB_PATH;
}

export function createDatabaseManager(): DatabaseManager {
  return new DatabaseManager(getDatabasePath());
}
