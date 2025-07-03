import { Command } from 'commander';
import { createDatabaseManager } from '../utils/database.js';
import { createFeedServices } from '../../../services/factory.js';

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all RSS feeds')
    .option('-v, --verbose', 'Show detailed information including last updated time')
    .action((options: { verbose?: boolean }) => {
      const dbManager = createDatabaseManager();

      try {
        dbManager.migrate();
        const feedService = createFeedServices(dbManager);

        const feeds = feedService.getFeedList();

        if (feeds.length === 0) {
          console.log('No feeds found. Use "termfeed add <url>" to add a feed.');
          return;
        }

        console.log('RSS Feeds:');
        console.log('----------');

        for (const feed of feeds) {
          console.log(`[${feed.id}] ${feed.title || 'Untitled'}`);
          if (feed.description) {
            console.log(`    ${feed.description}`);
          }
          console.log(`    URL: ${feed.url}`);
          console.log(
            `    Rating: ${'★'.repeat(feed.rating)}${'☆'.repeat(5 - feed.rating)} (${feed.rating}/5)`
          );

          if (options.verbose && feed.last_updated_at) {
            // last_updated_atはミリ秒単位のタイムスタンプ
            const lastUpdated = new Date(feed.last_updated_at);
            console.log(`    Last updated: ${lastUpdated.toLocaleString()}`);
          }

          console.log('');
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error listing feeds: ${error.message}`);
        } else {
          console.error('Error listing feeds:', error);
        }
        process.exit(1);
      } finally {
        dbManager.close();
      }
    });

  return command;
}
