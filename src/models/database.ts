import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || this.getDefaultDbPath();
    this.ensureDbDirectory();
    this.db = new Database(this.dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  private getDefaultDbPath(): string {
    // XDG Base Directory specificationに従う
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    const dataDir = path.join(xdgDataHome, 'termfeed');
    return path.join(dataDir, 'termfeed.db');
  }

  private ensureDbDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public migrate(): void {
    // 開発時とビルド後で異なるパスを試行
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '..', '..', 'src', 'models', 'schema.sql');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // SQLファイルを個別のステートメントに分割して実行
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      this.db.exec(statement);
    }

    console.log('Database migration completed successfully');
  }

  public getDb(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}
