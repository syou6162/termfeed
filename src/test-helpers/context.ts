import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DatabaseManager } from '@/models/database.js';
import { FeedModel } from '@/models/feed.js';
import { ArticleModel } from '@/models/article.js';

export interface TestContext {
  tempDir: string;
  dbPath: string;
  database: DatabaseManager;
  feedModel: FeedModel;
  articleModel: ArticleModel;
  cleanup: () => void;
}

export function createTestContext(): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'termfeed-test-'));
  const dbPath = join(tempDir, 'test.db');

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
