import { Command } from 'commander';
import { DatabaseManager } from '../../models/database.js';
import { FeedModel } from '../../models/feed.js';
import { ArticleModel } from '../../models/article.js';
import { FeedService } from '../../services/feed-service.js';
import { parsePositiveInteger } from '../utils/validation.js';

export function createRmCommand(): Command {
  const command = new Command('rm');

  command
    .description('Remove RSS feed by ID')
    .argument('<feedId>', 'Feed ID to remove')
    .action(async (feedId: string) => {
      const dbPath = process.env.TERMFEED_DB || './termfeed.db';
      const dbManager = new DatabaseManager(dbPath);

      try {
        const id = parsePositiveInteger(feedId, 'feed ID');

        const feedModel = new FeedModel(dbManager);
        const articleModel = new ArticleModel(dbManager);
        const feedService = new FeedService(feedModel, articleModel);

        const success = await Promise.resolve(feedService.removeFeed(id));
        if (success) {
          console.log(`Feed ID ${id} removed successfully!`);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error removing feed: ${error.message}`);
        } else {
          console.error('Error removing feed:', error);
        }
        process.exit(1);
      } finally {
        dbManager.close();
      }
    });

  return command;
}
