import { Command } from 'commander';
import { DatabaseManager } from '../../models/database.js';
import { FeedModel } from '../../models/feed.js';
import { ArticleModel } from '../../models/article.js';
import { FeedService } from '../../services/feed-service.js';
import { parseOptionalPositiveInteger, parsePositiveInteger } from '../utils/validation.js';

export function createArticlesCommand(): Command {
  const command = new Command('articles');

  command
    .description('List articles from feeds')
    .option('-f, --feed <feedId>', 'Show articles from specific feed ID')
    .option('-u, --unread', 'Show only unread articles')
    .option('-r, --favorites', 'Show only favorite articles')
    .option('-l, --limit <number>', 'Limit number of articles to show', '20')
    .action((options: { feed?: string; unread?: boolean; favorites?: boolean; limit: string }) => {
      const dbPath = process.env.TERMFEED_DB || './termfeed.db';
      const dbManager = new DatabaseManager(dbPath);

      try {
        const feedModel = new FeedModel(dbManager);
        const articleModel = new ArticleModel(dbManager);
        const feedService = new FeedService(feedModel, articleModel);

        console.log('Listing articles...');

        const feedId = parseOptionalPositiveInteger(options.feed, 'feed ID');
        const limit = parsePositiveInteger(options.limit, 'limit');

        const articles = feedService.getArticles({
          feed_id: feedId,
          is_read: options.unread ? false : undefined,
          is_favorite: options.favorites ? true : undefined,
          limit,
        });

        if (articles.length === 0) {
          console.log('No articles found matching the criteria.');
          return;
        }

        console.log(`\nFound ${articles.length} articles:\n`);

        for (const article of articles) {
          const status = [];
          if (!article.is_read) status.push('UNREAD');
          if (article.is_favorite) status.push('★');

          console.log(`${article.id}. ${article.title}`);
          console.log(`   URL: ${article.url}`);
          console.log(`   Published: ${article.published_at.toISOString().split('T')[0]}`);
          if (article.author) console.log(`   Author: ${article.author}`);
          if (status.length > 0) console.log(`   Status: ${status.join(' ')}`);
          console.log('');
        }

        // 統計情報を表示
        const totalCount = feedId
          ? articleModel.countByFeedId(feedId)
          : articleModel.countByFeedId(0);
        const unreadCount = feedService.getUnreadCount(feedId);
        console.log(`Total: ${totalCount} articles, Unread: ${unreadCount}`);
      } catch (error) {
        console.error('Error listing articles:', error);
        process.exit(1);
      } finally {
        dbManager.close();
      }
    });

  return command;
}
