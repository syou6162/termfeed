#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import {
  createAddCommand,
  createRmCommand,
  createTuiCommand,
  exportCommand,
  importCommand,
  createMcpServerCommand,
} from './apps/cli/commands/index.js';

// package.jsonからバージョンを動的に読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// src/index.ts または dist/index.js のどちらから実行されても対応
const packageJsonPath = __filename.includes('/dist/')
  ? join(__dirname, '../../package.json')
  : join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const program = createMainProgram();
  program.parse();
}
