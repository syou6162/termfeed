import { Command } from 'commander';
import { parsePositiveInteger } from '../utils/validation.js';
import { createDatabaseManager } from '../utils/database.js';
import { createServices } from '../utils/services.js';

export function createRmCommand(): Command {
  const command = new Command('rm');

  command
    .description('Remove RSS feed by ID')
    .argument('<feedId>', 'Feed ID to remove')
    .action((feedId: string) => {
      const dbManager = createDatabaseManager();

      try {
        const id = parsePositiveInteger(feedId, 'feed ID');

        const { feedService } = createServices(dbManager);

        const success = feedService.removeFeed(id);
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
