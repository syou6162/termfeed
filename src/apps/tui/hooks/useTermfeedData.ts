import { useMemo } from 'react';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { createDatabaseManager } from '../../cli/utils/database.js';
import type { DatabaseManager } from '../../../models/database.js';

export type TermfeedData = {
  feedService: FeedService;
  databaseManager: ReturnType<typeof createDatabaseManager>;
};

/**
 * DatabaseManagerの初期化、Model/Serviceの初期化、マイグレーションの実行を行うカスタムフック
 * App.tsxのuseMemoによる初期化ロジックをカプセル化
 */
export function useTermfeedData(databaseManagerProp?: DatabaseManager): TermfeedData {
  const { feedService, databaseManager } = useMemo(() => {
    // 外部から渡されたDatabaseManagerがあればそれを使用、なければ新規作成
    const dbManager = databaseManagerProp || createDatabaseManager();

    // 外部から渡されていない場合のみマイグレーションを実行
    if (!databaseManagerProp) {
      dbManager.migrate();
    }

    const feedModel = new FeedModel(dbManager);
    const articleModel = new ArticleModel(dbManager);
    const feedService = new FeedService(feedModel, articleModel);

    return { feedService, databaseManager: dbManager };
  }, [databaseManagerProp]);

  return { feedService, databaseManager };
}
