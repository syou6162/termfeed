import { Command } from 'commander';
import { MockFeedService } from '../../services/mocks';

export function createListCommand(): Command {
  const command = new Command('list');
  const feedService = new MockFeedService();

  command.description('List all RSS feeds').action(async () => {
    try {
      console.log('Listing all feeds...\n');
      const feeds = await feedService.getAllFeeds();

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
    }
  });

  return command;
}
