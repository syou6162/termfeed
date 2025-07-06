import { Command } from 'commander';
import { createFeedServices } from '../../../services/factory.js';
import { createDatabaseManager } from '../utils/database.js';

export const createListCommand = () => {
  const command = new Command('list').description('List all feeds').action(() => {
    const databaseManager = createDatabaseManager();
    databaseManager.migrate();

    const { feedService } = createFeedServices(databaseManager);
    const feeds = feedService.getFeedList();

    if (feeds.length === 0) {
      console.log('No feeds found.');
      return;
    }

    // Sort feeds by ID for consistent display
    feeds.sort((a, b) => a.id - b.id);

    for (const feed of feeds) {
      console.log(`${feed.id}: ${feed.title}`);
    }
  });

  return command;
};
