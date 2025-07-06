import { DatabaseManager } from '../models/database.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { FeedService } from './feed-service.js';
import { ArticleService } from './article-service.js';
import { PinService } from './pin.js';

/**
 * サービス層のファクトリー関数
 * データ層（Models）の初期化をサービス層で管理し、
 * アプリケーション層からのレイヤリング違反を防ぐ
 */
export function createFeedServices(databaseManager: DatabaseManager) {
  const feedModel = new FeedModel(databaseManager);
  const articleModel = new ArticleModel(databaseManager);
  const pinService = new PinService(databaseManager);
  const articleService = new ArticleService(articleModel, pinService);
  const feedService = new FeedService(feedModel, articleModel);

  return {
    feedService,
    articleService,
    pinService,
  };
}

/**
 * 個別のモデルも必要な場合（export/mcp-server等）のファクトリー
 */
export function createModelsAndServices(databaseManager: DatabaseManager) {
  const feedModel = new FeedModel(databaseManager);
  const articleModel = new ArticleModel(databaseManager);
  const pinService = new PinService(databaseManager);
  const articleService = new ArticleService(articleModel, pinService);
  const feedService = new FeedService(feedModel, articleModel);

  return {
    feedModel,
    articleModel,
    feedService,
    articleService,
    pinService,
  };
}
