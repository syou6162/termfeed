import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from '../../tui/App.js';
import { createTutorialServices } from '../utils/tutorial.js';

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
      // チュートリアルモード用のサービスを作成し、サンプルフィードを登録
      const { databaseManager } = await createTutorialServices(SAMPLE_FEEDS);

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
