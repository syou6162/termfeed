import { useMemo } from 'react';
import { createModelsAndServices } from '../../../services/factory.js';
import { createDatabaseManager } from '../../cli/utils/database.js';
import type { DatabaseManager } from '../../../models/database.js';
import type { FeedService } from '../../../services/feed-service.js';
import type { ArticleService } from '../../../services/article-service.js';
import type { PinService } from '../../../services/pin.js';
import type { FavoriteService } from '../../../services/favorite.js';

export type TermfeedData = {
  feedService: FeedService;
  articleService: ArticleService;
  pinService: PinService;
  favoriteService: FavoriteService;
  databaseManager: ReturnType<typeof createDatabaseManager>;
};

/**
 * DatabaseManagerの初期化、Model/Serviceの初期化、マイグレーションの実行を行うカスタムフック
 * App.tsxのuseMemoによる初期化ロジックをカプセル化
 *
 * @param databaseManagerProp - 外部から注入するDatabaseManager（チュートリアルモード用）
 */
export function useTermfeedData(databaseManagerProp?: DatabaseManager): TermfeedData {
  const { feedService, articleService, pinService, favoriteService, databaseManager } =
    useMemo(() => {
      // 外部から渡されたDatabaseManagerがあればそれを使用、なければ新規作成
      const dbManager = databaseManagerProp || createDatabaseManager();

      // 外部から渡されていない場合のみマイグレーションを実行
      if (!databaseManagerProp) {
        dbManager.migrate();
      }

      const { feedService, articleService, pinService, favoriteService } =
        createModelsAndServices(dbManager);

      return {
        feedService,
        articleService,
        pinService,
        favoriteService,
        databaseManager: dbManager,
      };
    }, [databaseManagerProp]);

  return {
    feedService,
    articleService,
    pinService,
    favoriteService,
    databaseManager,
  };
}
