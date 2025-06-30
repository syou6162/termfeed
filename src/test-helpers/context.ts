import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DatabaseManager } from '@/models/database.js';
import { FeedModel } from '@/models/feed.js';
import { ArticleModel } from '@/models/article.js';

export type TestContext = {
  tempDir: string;
  dbPath: string;
  database: DatabaseManager;
  feedModel: FeedModel;
  articleModel: ArticleModel;
  cleanup: () => void;
};

export type TestContextOptions = {
  useInMemory?: boolean;
};

export function createTestContext(options: TestContextOptions = {}): TestContext {
  const { useInMemory = false } = options; // CLIテストではファイルベースが必要なので、デフォルトはfalse

  let tempDir: string;
  let dbPath: string;

  if (useInMemory) {
    // インメモリDBでも一時ディレクトリは作成（CLIテストの互換性のため）
    tempDir = mkdtempSync(join(tmpdir(), 'termfeed-test-'));
    dbPath = ':memory:';
  } else {
    tempDir = mkdtempSync(join(tmpdir(), 'termfeed-test-'));
    dbPath = join(tempDir, 'test.db');
  }

  const database = new DatabaseManager(dbPath);
  database.migrate();

  const feedModel = new FeedModel(database);
  const articleModel = new ArticleModel(database);

  return {
    tempDir,
    dbPath,
    database,
    feedModel,
    articleModel,
    cleanup: () => {
      database.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
