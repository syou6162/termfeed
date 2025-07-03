import { Command } from 'commander';
import { launchTuiApp } from '../utils/tui-launcher.js';
import { App } from '../../tui/App.js';

export function createTuiCommand(): Command {
  const tuiCommand = new Command('tui');

  tuiCommand.description('Start RSS reader in TUI mode').action(() => {
    // TUIアプリケーション内でマイグレーションが実行される
    launchTuiApp(<App />, {
      appName: 'TUI',
    });
  });

  return tuiCommand;
}
