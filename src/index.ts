import { Command } from 'commander';
import { createRequire } from 'module';
import {
  createAddCommand,
  createRmCommand,
  createListCommand,
  createUpdateCommand,
  createTuiCommand,
  exportCommand,
  importCommand,
  createMcpServerCommand,
  createTutorialCommand,
} from './apps/cli/commands/index.js';

// 標準的な方法でpackage.jsonを読み込む
const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string; name: string };

export const VERSION = packageJson.version;
export { packageJson };

/**
 * CLIのメインプログラムを作成します。
 * テストからの利用を想定して、インスタンス化可能な関数として公開しています。
 */
export function createMainProgram(): Command {
  const program = new Command();

  program
    .name('termfeed')
    .description('A terminal-based RSS reader with Vim-like keybindings')
    .version(VERSION)
    .addHelpCommand('help [command]', 'Display help for command');

  // Register subcommands
  program.addCommand(createAddCommand());
  program.addCommand(createRmCommand());
  program.addCommand(createListCommand());
  program.addCommand(createUpdateCommand());
  program.addCommand(createTuiCommand());
  program.addCommand(exportCommand);
  program.addCommand(importCommand);
  program.addCommand(createMcpServerCommand());
  program.addCommand(createTutorialCommand());

  return program;
}

// CLI実行用のデフォルトエクスポート
export default function runCLI() {
  const program = createMainProgram();
  program.parse();
}
