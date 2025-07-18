import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseManager } from '../../models/database.js';
import { ArticleModel } from '../../models/article.js';
import { FeedModel } from '../../models/feed.js';
import { registerArticleResources } from './resources/articles.js';
import { registerFeedTools } from './tools/feeds.js';
import { registerArticleTools } from './tools/articles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8')) as {
  name: string;
  version: string;
};

export async function createMcpServer(
  databaseManager: DatabaseManager,
  articleModel: ArticleModel,
  feedModel: FeedModel
): Promise<McpServer> {
  const server = new McpServer({
    name: packageJson.name,
    version: packageJson.version,
  });

  // Register resources
  registerArticleResources(server, articleModel, feedModel);

  // Register tools
  registerFeedTools(server, databaseManager);
  registerArticleTools(server, articleModel);

  // Connect using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
