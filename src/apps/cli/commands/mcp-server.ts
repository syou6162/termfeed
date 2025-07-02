import { Command } from 'commander';
import { createMcpServer } from '../../mcp/server.js';
import { createDatabaseManager } from '../utils/database.js';
import { createServices } from '../utils/services.js';

export function createMcpServerCommand(): Command {
  const command = new Command('mcp-server');

  command.description('Start MCP server to expose termfeed data to LLM agents').action(async () => {
    const dbManager = createDatabaseManager();

    try {
      dbManager.migrate();
      const { feedModel, articleModel } = createServices(dbManager);

      console.error('Starting MCP server...');

      const server = await createMcpServer(articleModel, feedModel);

      // Graceful shutdown
      const shutdown = async () => {
        console.error('\nShutting down MCP server...');
        await server.close();
        dbManager.close();
        process.exit(0);
      };

      process.on('SIGINT', () => void shutdown());
      process.on('SIGTERM', () => void shutdown());

      // Keep the process running
      await new Promise(() => {});
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error starting MCP server: ${error.message}`);
      } else {
        console.error('Error starting MCP server:', error);
      }
      dbManager.close();
      process.exit(1);
    }
  });

  return command;
}
