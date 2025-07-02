import { DatabaseManager } from '../../../models/database.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';

export function createServices(databaseManager: DatabaseManager) {
  const feedModel = new FeedModel(databaseManager);
  const articleModel = new ArticleModel(databaseManager);
  const feedService = new FeedService(feedModel, articleModel);

  return {
    feedModel,
    articleModel,
    feedService,
  };
}
