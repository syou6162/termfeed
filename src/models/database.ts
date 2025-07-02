import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const IN_MEMORY_DB = ':memory:';

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || this.getDefaultDbPath();

    // インメモリDBの場合はディレクトリ作成をスキップ
    if (this.dbPath !== IN_MEMORY_DB) {
      this.ensureDbDirectory();
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('foreign_keys = ON');

    // インメモリDBの場合はWALモードを設定しない
    if (this.dbPath !== IN_MEMORY_DB) {
      this.db.pragma('journal_mode = WAL');
    }
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
    // NPMパッケージの標準的なリソース解決方法
    const require = createRequire(import.meta.url);

    let schemaPath: string;
    try {
      // NPMパッケージとしてインストールされている場合
      schemaPath = require.resolve('termfeed/src/models/schema.sql');
    } catch {
      // 開発環境・ローカルビルドでは常にsrcディレクトリを参照
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
  }

  public getDb(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }

  public isInMemory(): boolean {
    return this.dbPath === IN_MEMORY_DB;
  }
}
