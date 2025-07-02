#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import {
  createAddCommand,
  createRmCommand,
  createTuiCommand,
  exportCommand,
  importCommand,
  createMcpServerCommand,
} from './apps/cli/commands/index.js';

// ESモジュールでpackage.jsonを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string;
};

export const VERSION = packageJson.version;

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

// Main CLI entry point
// npmやnpx経由で実行される場合、process.argv[1]はシンボリックリンクを指すことがあるため、
// パスの末尾も確認して実行を検出する
const isMainModule =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('/termfeed') ||
    process.argv[1].endsWith('\\termfeed'));

if (isMainModule) {
  const program = createMainProgram();
  program.parse();
}
