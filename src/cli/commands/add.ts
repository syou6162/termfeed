import { Command } from 'commander';
import { DatabaseManager } from '../../models/database.js';
import { FeedModel } from '../../models/feed.js';
import { ArticleModel } from '../../models/article.js';
import { FeedService } from '../../services/feed-service.js';

export function createAddCommand(): Command {
  const command = new Command('add');

  command
    .description('Add a new RSS feed')
    .argument('<url>', 'RSS feed URL to add')
    .option('-t, --title <title>', 'Custom title for the feed')
    .action(async (url: string) => {
      const dbPath = process.env.TERMFEED_DB || './termfeed.db';
      const dbManager = new DatabaseManager(dbPath);
      
      try {
        dbManager.migrate();
        const feedModel = new FeedModel(dbManager);
        const articleModel = new ArticleModel(dbManager);
        const feedService = new FeedService(feedModel, articleModel);

        console.log(`Adding feed: ${url}`);

        // フィード追加
        const result = await feedService.addFeed(url);
        
        console.log(`Feed added successfully!`);
        console.log(`  ID: ${result.feed.id}`);
        console.log(`  Title: ${result.feed.title}`);
        if (result.feed.description) {
          console.log(`  Description: ${result.feed.description}`);
        }
        console.log(`  Articles added: ${result.articlesCount}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error adding feed: ${error.message}`);
        } else {
          console.error('Error adding feed:', error);
        }
        process.exit(1);
      } finally {
        dbManager.close();
      }
    });

  return command;
}
