import { Command } from 'commander';
import { MockFeedService } from '../../services/mocks';

export function createUpdateCommand(): Command {
  const command = new Command('update');
  const feedService = new MockFeedService();

  command
    .description('Update RSS feeds and fetch new articles')
    .option('-f, --feed <feedId>', 'Update specific feed ID only')
    .option('-a, --all', 'Update all feeds (default)')
    .action(async (options: { feed?: string; all?: boolean }) => {
      try {
        if (options.feed) {
          const feedId = parseInt(options.feed, 10);
          if (isNaN(feedId) || feedId <= 0) {
            console.error('Invalid feed ID: must be a positive number');
            process.exit(1);
          }

          console.log(`Updating feed ID: ${feedId}`);
          console.log('- Fetching RSS content...');
          console.log('- Parsing new articles...');
          console.log('- Saving to database...');

          await feedService.updateFeed(feedId);
          console.log('Feed updated successfully!');
        } else {
          console.log('Updating all feeds...');
          const feeds = await feedService.getAllFeeds();
          console.log(`Found ${feeds.length} feeds to update`);

          for (const feed of feeds) {
            console.log(`- Updating "${feed.title}" (ID: ${feed.id})`);
          }

          console.log('- Fetching RSS content...');
          console.log('- Parsing new articles...');
          console.log('- Saving to database...');

          await feedService.updateAllFeeds();
          console.log('All feeds updated successfully!');
        }
      } catch (error) {
        console.error('Error updating feeds:', error);
        process.exit(1);
      }
    });

  return command;
}
