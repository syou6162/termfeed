import { Command } from 'commander';
import { MockFeedService } from '../../services/mocks';

export function createAddCommand(): Command {
  const command = new Command('add');
  const feedService = new MockFeedService();

  command
    .description('Add a new RSS feed')
    .argument('<url>', 'RSS feed URL to add')
    .option('-t, --title <title>', 'Custom title for the feed')
    .action(async (url: string, options: { title?: string }) => {
      try {
        console.log(`Adding feed: ${url}`);

        // URLバリデーション
        let feedInfo;
        try {
          feedInfo = await feedService.validateFeedUrl(url);
        } catch {
          console.error('Invalid RSS feed URL');
          process.exit(1);
        }

        // タイトルの決定
        const title = options.title || feedInfo.title;
        console.log(`Title: ${title}`);
        if (feedInfo.description) {
          console.log(`Description: ${feedInfo.description}`);
        }

        // フィード追加
        const newFeed = await feedService.addFeed({
          url,
          title,
          description: feedInfo.description,
        });

        console.log(`Feed added successfully! ID: ${newFeed.id}`);
      } catch (error) {
        console.error('Error adding feed:', error);
        process.exit(1);
      }
    });

  return command;
}
