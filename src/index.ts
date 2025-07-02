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

// NPMパッケージなど異なる環境でもpackage.jsonを見つけられるようにする
function findPackageJson(): { version: string } {
  const possiblePaths = [
    join(__dirname, '../package.json'),
    join(__dirname, '../../package.json'),
    join(process.cwd(), 'package.json'),
  ];

  for (const path of possiblePaths) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as { version: string };
    } catch {
      // このパスでは見つからなかった、次を試す
    }
  }

  // フォールバック値
  return { version: 'unknown' };
}

const packageJson = findPackageJson();
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
const program = createMainProgram();
program.parse();
