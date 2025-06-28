import { Command } from 'commander';
import { MockFeedService } from '../../services/mocks';

export function createRmCommand(): Command {
  const command = new Command('rm');
  const feedService = new MockFeedService();

  command
    .description('Remove RSS feed by ID')
    .argument('<feedId>', 'Feed ID to remove')
    .action(async (feedId: string) => {
      try {
        const id = parseInt(feedId, 10);
        if (isNaN(id) || id <= 0) {
          console.error('Invalid feed ID: must be a positive number');
          process.exit(1);
        }

        const success = await feedService.removeFeed(id);

        if (success) {
          console.log(`Feed ID ${id} removed successfully!`);
        } else {
          console.error(`Feed ID ${id} not found`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error removing feed:', error);
        process.exit(1);
      }
    });

  return command;
}
