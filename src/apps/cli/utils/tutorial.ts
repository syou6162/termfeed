import { DatabaseManager } from '../../../models/database.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';

export interface TutorialServices {
  databaseManager: DatabaseManager;
  feedService: FeedService;
}

/**
 * チュートリアルモード用のサービスを作成し、サンプルフィードを登録する
 * @param feedUrls 登録するフィードのURLリスト
 * @returns 初期化されたサービス群
 */
export async function createTutorialServices(feedUrls: string[]): Promise<TutorialServices> {
  // インメモリDBを使用してDatabaseManagerを初期化
  const databaseManager = new DatabaseManager(':memory:');
  databaseManager.migrate();

  // モデルとサービスの初期化
  const feedModel = new FeedModel(databaseManager);
  const articleModel = new ArticleModel(databaseManager);
  const feedService = new FeedService(feedModel, articleModel);

  // サンプルフィードの登録とクロール
  for (const feedUrl of feedUrls) {
    try {
      // フィードを登録してクロール
      await feedService.addFeed(feedUrl);
    } catch {
      // サイレントに失敗を処理
    }
  }

  return {
    databaseManager,
    feedService,
  };
}
