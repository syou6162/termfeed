import { Command } from 'commander';
import { MockArticleService } from '../../services/mocks';

export function createArticlesCommand(): Command {
  const command = new Command('articles');
  const articleService = new MockArticleService();

  command
    .description('List articles from feeds')
    .option('-f, --feed <feedId>', 'Show articles from specific feed ID')
    .option('-u, --unread', 'Show only unread articles')
    .option('-r, --favorites', 'Show only favorite articles')
    .option('-l, --limit <number>', 'Limit number of articles to show', '20')
    .action(
      async (options: { feed?: string; unread?: boolean; favorites?: boolean; limit: string }) => {
        try {
          console.log('Listing articles...');

          const feedId = options.feed ? parseInt(options.feed, 10) : undefined;
          const limit = parseInt(options.limit, 10);

          if (options.feed && (isNaN(feedId!) || feedId! <= 0)) {
            console.error('Invalid feed ID: must be a positive number');
            process.exit(1);
          }

          if (isNaN(limit) || limit <= 0) {
            console.error('Invalid limit: must be a positive number');
            process.exit(1);
          }

          const articles = await articleService.getArticles({
            feedId,
            isRead: options.unread ? false : undefined,
            isFavorite: options.favorites ? true : undefined,
            limit,
          });

          if (articles.length === 0) {
            console.log('No articles found matching the criteria.');
            return;
          }

          console.log(`\nFound ${articles.length} articles:\n`);

          for (const article of articles) {
            const status = [];
            if (!article.is_read) status.push('UNREAD');
            if (article.is_favorite) status.push('★');

            console.log(`${article.id}. ${article.title}`);
            console.log(`   URL: ${article.url}`);
            console.log(`   Published: ${article.published_at.toISOString().split('T')[0]}`);
            if (article.author) console.log(`   Author: ${article.author}`);
            if (status.length > 0) console.log(`   Status: ${status.join(' ')}`);
            console.log('');
          }

          // 統計情報を表示
          const totalCount = await articleService.getTotalCount(feedId);
          const unreadCount = await articleService.getUnreadCount(feedId);
          console.log(`Total: ${totalCount} articles, Unread: ${unreadCount}`);
        } catch (error) {
          console.error('Error listing articles:', error);
          process.exit(1);
        }
      }
    );

  return command;
}
