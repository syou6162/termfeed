import { Command } from 'commander';
import { DatabaseManager } from '../../../models/database.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { render } from 'ink';
import React from 'react';
import { App } from '../../tui/App.js';

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
      // インメモリDBを使用してDatabaseManagerを初期化
      const databaseManager = new DatabaseManager(':memory:');
      databaseManager.migrate();

      // モデルとサービスの初期化
      const feedModel = new FeedModel(databaseManager);
      const articleModel = new ArticleModel(databaseManager);
      const feedService = new FeedService(feedModel, articleModel);

      // サンプルフィードの登録とクロール
      for (const feedUrl of SAMPLE_FEEDS) {
        try {
          // フィードを登録してクロール
          await feedService.addFeed(feedUrl);
        } catch {
          // サイレントに失敗を処理
        }
      }

      // TUIモードを起動
      try {
        // @ts-expect-error - カスタムpropsを渡すため
        render(React.createElement(App, { databaseManager }));
      } catch {
        process.exit(1);
      }
    });

  return command;
}
