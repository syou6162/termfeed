import { Command } from 'commander';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { createDatabaseManager } from '../utils/database.js';

export function createListCommand(): Command {
  const command = new Command('list');

  command.description('List all RSS feeds').action(() => {
    const dbManager = createDatabaseManager();

    try {
      const feedModel = new FeedModel(dbManager);
      const articleModel = new ArticleModel(dbManager);
      const feedService = new FeedService(feedModel, articleModel);

      console.log('Listing all feeds...\n');
      const feeds = feedService.getFeedList();

      if (feeds.length === 0) {
        console.log('No feeds found. Add a feed with: termfeed add <url>');
        return;
      }

      for (const feed of feeds) {
        console.log(`${feed.id}. ${feed.title}`);
        console.log(`   URL: ${feed.url}`);
        if (feed.description) {
          console.log(`   Description: ${feed.description}`);
        }
        console.log(`   Last updated: ${feed.last_updated_at.toISOString().split('T')[0]}`);
        console.log('');
      }

      console.log(`Total: ${feeds.length} feeds`);
    } catch (error) {
      console.error('Error listing feeds:', error);
      process.exit(1);
    } finally {
      dbManager.close();
    }
  });

  return command;
}
