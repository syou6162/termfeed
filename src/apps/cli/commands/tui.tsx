import { render } from 'ink';
import { Command } from 'commander';
import { App } from '../../tui/App.js';

export function createTuiCommand(): Command {
  const tuiCommand = new Command('tui');

  tuiCommand.description('Start RSS reader in TUI mode').action(() => {
    try {
      // TUIアプリケーション内でマイグレーションが実行される

      // TUIアプリケーションを起動
      const { clear, unmount } = render(<App />);

      // プロセス終了時のクリーンアップ（Raw modeエラー防止）
      const cleanup = () => {
        clear();
        unmount();
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      console.error('TUIの起動に失敗しました:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

  return tuiCommand;
}
