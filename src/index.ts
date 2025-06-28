#!/usr/bin/env node

import { Command } from 'commander';
import {
  createAddCommand,
  createArticlesCommand,
  createUpdateCommand,
  createListCommand,
  createRmCommand,
} from './cli/commands/index.js';

export const VERSION = '0.1.0';

const program = new Command();

program
  .name('termfeed')
  .description('A terminal-based RSS reader with Vim-like keybindings')
  .version(VERSION);

// Register subcommands
program.addCommand(createAddCommand());
program.addCommand(createArticlesCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createListCommand());
program.addCommand(createRmCommand());

// Main CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
