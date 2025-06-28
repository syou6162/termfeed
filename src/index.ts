#!/usr/bin/env node

import { Command } from 'commander';
import {
  createAddFeedCommand,
  createListCommand,
  createUpdateCommand,
  createFeedsCommand,
} from './cli/commands';

export const VERSION = '0.1.0';

const program = new Command();

program
  .name('termfeed')
  .description('A terminal-based RSS reader with Vim-like keybindings')
  .version(VERSION);

// Register subcommands
program.addCommand(createAddFeedCommand());
program.addCommand(createListCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createFeedsCommand());

// Main CLI entry point
if (require.main === module) {
  program.parse();
}
