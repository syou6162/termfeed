import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { App } from '../../tui/App.js';
import { createDatabaseManager } from '../utils/database.js';

export function createTuiCommand(): Command {
  const command = new Command('tui');

  command.description('Launch the Terminal UI').action(async () => {
    const dbManager = createDatabaseManager();

    try {
      dbManager.migrate();

      const { waitUntilExit } = render(
        <App
          dbManager={dbManager}
          onExit={() => {
            process.exit(0);
          }}
        />
      );

      await waitUntilExit();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error launching TUI: ${error.message}`);
      } else {
        console.error('Error launching TUI:', error);
      }
      process.exit(1);
    } finally {
      dbManager.close();
    }
  });

  return command;
}
