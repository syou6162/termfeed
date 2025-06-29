#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import {
  createAddCommand,
  createUpdateCommand,
  createRmCommand,
  createTuiCommand,
  exportCommand,
  importCommand,
  createMcpServerCommand,
} from './apps/cli/commands/index.js';

export const VERSION = '0.1.0';

const program = new Command();

program
  .name('termfeed')
  .description('A terminal-based RSS reader with Vim-like keybindings')
  .version(VERSION);

// Register subcommands
program.addCommand(createAddCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createRmCommand());
program.addCommand(createTuiCommand());
program.addCommand(exportCommand);
program.addCommand(importCommand);
program.addCommand(createMcpServerCommand());

// Main CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  program.parse();
}
