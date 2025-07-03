import { Command } from 'commander';
import { createDatabaseManager } from '../utils/database.js';
import { createFeedServices } from '../../../services/factory.js';

export function createUpdateCommand(): Command {
  const command = new Command('update');

  command
    .description('Update all RSS feeds')
    .option('-f, --feed-id <id>', 'Update specific feed by ID')
    .action(async (options: { feedId?: string }) => {
      const dbManager = createDatabaseManager();

      try {
        dbManager.migrate();
        const feedService = createFeedServices(dbManager);

        if (options.feedId) {
          // 特定のフィードを更新
          const feedId = parseInt(options.feedId, 10);
          if (isNaN(feedId) || feedId <= 0) {
            console.error('Invalid feed ID. Please provide a positive integer.');
            process.exit(1);
          }

          console.log(`Updating feed ID ${feedId}...`);
          try {
            const result = await feedService.updateFeed(feedId);
            console.log(`Feed updated successfully!`);
            console.log(`  New articles: ${result.newArticlesCount}`);
            console.log(`  Updated articles: ${result.updatedArticlesCount}`);
            console.log(`  Total articles: ${result.totalArticlesCount}`);
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Error updating feed: ${error.message}`);
            } else {
              console.error('Error updating feed:', error);
            }
            process.exit(1);
          }
        } else {
          // すべてのフィードを更新
          console.log('Updating all feeds...');

          const result = await feedService.updateAllFeeds((progress) => {
            process.stdout.write(
              `\rUpdating feed ${progress.currentIndex}/${progress.totalFeeds}: ${progress.currentFeedTitle}`
            );
          });

          console.log('\n'); // 改行

          if ('cancelled' in result && result.cancelled) {
            console.log('Update cancelled.');
            console.log(`Processed ${result.processedFeeds} out of ${result.totalFeeds} feeds.`);
          } else if ('summary' in result) {
            console.log('Update completed!');
            console.log(`  Total feeds: ${result.summary.totalFeeds}`);
            console.log(`  Successful: ${result.summary.successCount}`);
            console.log(`  Failed: ${result.summary.failureCount}`);

            if (result.failed.length > 0) {
              console.log('\nFailed feeds:');
              for (const failure of result.failed) {
                console.log(`  - [${failure.feedId}] ${failure.feedUrl}: ${failure.error.message}`);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error updating feeds: ${error.message}`);
        } else {
          console.error('Error updating feeds:', error);
        }
        process.exit(1);
      } finally {
        dbManager.close();
      }
    });

  return command;
}
