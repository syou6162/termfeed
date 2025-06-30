import { useMemo } from 'react';
import { FeedModel } from '@/models/feed.js';
import { ArticleModel } from '@/models/article.js';
import { FeedService } from '@/services/feed-service.js';
import { createDatabaseManager } from '@/apps/cli/utils/database.js';

export type TermfeedData = {
  feedService: FeedService;
};

/**
 * DatabaseManagerの初期化、Model/Serviceの初期化、マイグレーションの実行を行うカスタムフック
 * App.tsxのuseMemoによる初期化ロジックをカプセル化
 */
export function useTermfeedData(): TermfeedData {
  const { feedService } = useMemo(() => {
    const databaseManager = createDatabaseManager();
    // マイグレーションを実行
    databaseManager.migrate();

    const feedModel = new FeedModel(databaseManager);
    const articleModel = new ArticleModel(databaseManager);
    const feedService = new FeedService(feedModel, articleModel);

    return { feedService };
  }, []);

  return { feedService };
}
