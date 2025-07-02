import { Command } from 'commander';
import { createRequire } from 'module';
import {
  createAddCommand,
  createRmCommand,
  createTuiCommand,
  exportCommand,
  importCommand,
  createMcpServerCommand,
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
    .version(VERSION);

  // Register subcommands
  program.addCommand(createAddCommand());
  program.addCommand(createRmCommand());
  program.addCommand(createTuiCommand());
  program.addCommand(exportCommand);
  program.addCommand(importCommand);
  program.addCommand(createMcpServerCommand());

  return program;
}

// Main CLI entry point - デフォルトエクスポートで実行
// CLIツールとしてインポートされた場合のみ実行される
export default function runCLI() {
  const program = createMainProgram();
  program.parse();
}
