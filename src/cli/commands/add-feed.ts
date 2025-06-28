import { Command } from 'commander';

export function createAddFeedCommand(): Command {
  const command = new Command('add-feed');

  command
    .description('Add a new RSS feed')
    .argument('<url>', 'RSS feed URL to add')
    .option('-t, --title <title>', 'Custom title for the feed')
    .action((url: string, options: { title?: string }) => {
      try {
        console.log(`Adding feed: ${url}`);
        if (options.title) {
          console.log(`Custom title: ${options.title}`);
        }
        // TODO: Implement actual feed addition logic
        console.log('Feed added successfully (mock)');
      } catch (error) {
        console.error('Error adding feed:', error);
        process.exit(1);
      }
    });

  return command;
}
