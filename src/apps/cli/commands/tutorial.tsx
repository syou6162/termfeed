import { Command } from 'commander';
import { createDatabaseManager } from '../utils/database.js';
import { createFeedServices } from '../../../services/factory.js';
import { launchTuiApp } from '../utils/tui-launcher.js';
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
      const databaseManager = createDatabaseManager(':memory:');
      databaseManager.migrate();

      // サービス層の初期化
      const { feedService } = createFeedServices(databaseManager);

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
      launchTuiApp(<App databaseManager={databaseManager} />, {
        appName: 'チュートリアル',
        databaseManager,
      });
    });

  return command;
}
