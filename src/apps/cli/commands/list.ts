import { Command } from 'commander';
import { createFeedServices } from '../../../services/factory.js';
import { createDatabaseManager } from '../utils/database.js';

export const createListCommand = () => {
  const command = new Command('list').description('List all feeds').action(() => {
    const databaseManager = createDatabaseManager();
    databaseManager.migrate();

    const feedService = createFeedServices(databaseManager);
    const feeds = feedService.getFeedListByRating();

    if (feeds.length === 0) {
      console.log('No feeds found.');
      return;
    }

    // レーティング別にグループ化
    const feedsByRating = feeds.reduce((acc, feed) => {
      if (!acc[feed.rating]) {
        acc[feed.rating] = [];
      }
      acc[feed.rating].push(feed);
      return acc;
    }, {} as Record<number, typeof feeds>);

    // レーティング5から0まで順番に表示
    for (let rating = 5; rating >= 0; rating--) {
      const ratingFeeds = feedsByRating[rating];
      if (!ratingFeeds || ratingFeeds.length === 0) {
        continue;
      }

      // セクションヘッダー
      console.log(`## Rating ${rating} (${ratingFeeds.length} feeds)`);
      console.log('');

      // そのレーティングのフィード一覧
      for (const feed of ratingFeeds) {
        console.log(`${feed.id}: ${feed.title}`);
        console.log(`  URL: ${feed.url}`);
        if (feed.description) {
          console.log(`  Description: ${feed.description}`);
        }
        console.log('');
      }
    }
  });

  return command;
};
