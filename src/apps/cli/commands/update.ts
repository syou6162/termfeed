import { Command } from 'commander';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { parsePositiveInteger } from '../utils/validation.js';
import { createDatabaseManager } from '../utils/database.js';

export function createUpdateCommand(): Command {
  const command = new Command('update');

  command
    .description('Update RSS feeds and fetch new articles')
    .option('-f, --feed <feedId>', 'Update specific feed ID only')
    .option('-a, --all', 'Update all feeds (default)')
    .action(async (options: { feed?: string; all?: boolean }) => {
      const dbManager = createDatabaseManager();

      try {
        const feedModel = new FeedModel(dbManager);
        const articleModel = new ArticleModel(dbManager);
        const feedService = new FeedService(feedModel, articleModel);

        if (options.feed) {
          const feedId = parsePositiveInteger(options.feed, 'feed ID');

          console.log(`Updating feed ID: ${feedId}`);
          const result = await feedService.updateFeed(feedId);
          console.log(`Feed updated successfully! ${result.newArticlesCount} new articles added.`);
        } else {
          console.log('Updating all feeds...');
          const result = await feedService.updateAllFeeds();

          // キャンセルされた場合の処理
          if ('cancelled' in result) {
            console.log(
              `\nUpdate cancelled after processing ${result.processedFeeds}/${result.totalFeeds} feeds.`
            );
            console.log(`- Successful: ${result.successful.length}`);
            console.log(`- Failed: ${result.failed.length}`);
          } else {
            // 通常の完了
            console.log('\nUpdate summary:');
            console.log(`- Total feeds: ${result.summary.totalFeeds}`);
            console.log(`- Successful: ${result.summary.successCount}`);
            console.log(`- Failed: ${result.summary.failureCount}`);
          }

          if (result.failed.length > 0) {
            console.log('\nFailed feeds:');
            for (const failure of result.failed) {
              console.log(`- Feed ${failure.feedId}: ${failure.error.message}`);
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
