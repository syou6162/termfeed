import { Command } from 'commander';

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List articles from feeds')
    .option('-f, --feed <feedId>', 'Show articles from specific feed ID')
    .option('-u, --unread', 'Show only unread articles')
    .option('-r, --favorites', 'Show only favorite articles')
    .option('-l, --limit <number>', 'Limit number of articles to show', '20')
    .action((options: { feed?: string; unread?: boolean; favorites?: boolean; limit: string }) => {
      try {
        console.log('Listing articles...');
        if (options.feed) {
          console.log(`Feed ID: ${options.feed}`);
        }
        if (options.unread) {
          console.log('Showing only unread articles');
        }
        if (options.favorites) {
          console.log('Showing only favorite articles');
        }
        console.log(`Limit: ${options.limit}`);

        // TODO: Implement actual article listing logic
        console.log('Mock article list:');
        console.log('1. Sample Article Title 1');
        console.log('2. Sample Article Title 2');
        console.log('3. Sample Article Title 3');
      } catch (error) {
        console.error('Error listing articles:', error);
        process.exit(1);
      }
    });

  return command;
}
