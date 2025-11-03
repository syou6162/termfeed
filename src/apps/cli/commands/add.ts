import { Command } from 'commander';
import { createDatabaseManager } from '../utils/database.js';
import { createFeedServices } from '../../../services/factory.js';

export function createAddCommand(): Command {
  const command = new Command('add');

  command
    .description('Add a new RSS feed')
    .argument('<url>', 'RSS feed URL to add')
    .option('-t, --title <title>', 'Custom title for the feed')
    .action(async (url: string) => {
      const dbManager = createDatabaseManager();

      // AbortController作成（Ctrl+C対応）
      const abortController = new AbortController();
      process.on('SIGINT', () => abortController.abort());

      try {
        dbManager.migrate();
        const { feedService } = createFeedServices(dbManager);

        console.log(`Adding feed: ${url}`);

        // フィード追加（AbortSignal付き）
        const result = await feedService.addFeed(url, abortController.signal);

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
