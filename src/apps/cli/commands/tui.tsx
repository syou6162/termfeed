import { render } from 'ink';
import { Command } from 'commander';
import { App } from '../../tui/App.js';

export function createTuiCommand(): Command {
  const tuiCommand = new Command('tui');

  tuiCommand.description('TUIモードでRSSリーダーを起動').action(() => {
    try {
      // TUIアプリケーション内でマイグレーションが実行される

      // TUIアプリケーションを起動
      render(<App />);
    } catch (error) {
      console.error('TUIの起動に失敗しました:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      // データベース接続のクリーンアップは不要（App内で管理）
    }
  });

  return tuiCommand;
}
