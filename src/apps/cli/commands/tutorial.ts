import { Command } from 'commander';
import { DatabaseManager } from '../../../models/database.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { render } from 'ink';
import React from 'react';
import { App } from '../../tui/App.js';
import chalk from 'chalk';

// サンプルフィードのリスト
const SAMPLE_FEEDS = [
  'https://www.yasuhisay.info/rss',
  'https://product.10x.co.jp/rss',
  'https://tech-blog.monotaro.com/rss',
  'https://developer.hatenastaff.com/rss',
];

export function createTutorialCommand(): Command {
  const command = new Command('tutorial');

  command
    .description('Start RSS reader in tutorial mode (using in-memory database)')
    .action(async () => {
      console.log(chalk.blue('🎓 チュートリアルモードを開始します...'));
      console.log(
        chalk.gray('インメモリデータベースを使用するため、終了後にデータは削除されます。')
      );
      console.log();

      // インメモリDBを使用してDatabaseManagerを初期化
      const databaseManager = new DatabaseManager(':memory:');
      databaseManager.migrate();

      // モデルとサービスの初期化
      const feedModel = new FeedModel(databaseManager);
      const articleModel = new ArticleModel(databaseManager);
      const feedService = new FeedService(feedModel, articleModel);

      // サンプルフィードの登録とクロール
      console.log(chalk.blue('📥 サンプルフィードを登録しています...'));

      for (const feedUrl of SAMPLE_FEEDS) {
        process.stdout.write(chalk.gray(`${feedUrl} を処理中...`));

        try {
          // フィードを登録してクロール
          const result = await feedService.addFeed(feedUrl);
          console.log(
            chalk.green(` ✓ ${result.feed.title} - ${result.articlesCount} 件の記事を取得しました`)
          );
        } catch (error) {
          console.log(
            chalk.red(
              ` ✗ 処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      }

      console.log();
      console.log(chalk.green('✅ サンプルフィードの準備が完了しました！'));
      console.log(chalk.gray('TUIモードを起動しています...'));
      console.log();

      // TUIモードを起動
      // TODO: インメモリDBを使用したAppコンポーネントを起動する必要がある
      // 現在のAppコンポーネントは内部でcreateeDatabaseManagerを使用しているため、
      // インメモリDB対応のためにリファクタリングが必要
      render(React.createElement(App));
    });

  return command;
}
