import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { DatabaseManager } from '../../models/database.js';
import { FeedModel } from '../../models/feed.js';
import { OPMLService, ExportFormat } from '../../services/opml.js';

export const exportCommand = new Command('export')
  .description('Export feed subscriptions to OPML or text file')
  .argument('[file]', 'output file path (default: termfeed-export.opml)')
  .option('-f, --format <format>', 'export format (opml or text)', 'auto')
  .action(async (file?: string, options?: { format?: string }) => {
    try {
      const dbManager = new DatabaseManager();
      dbManager.migrate();
      const feedModel = new FeedModel(dbManager);

      // すべてのフィードを取得
      const feeds = feedModel.findAll();

      if (feeds.length === 0) {
        console.log(chalk.yellow('No feeds to export'));
        return;
      }

      // ファイルパスの決定
      const outputPath = file || 'subscriptions.opml';
      const absolutePath = path.resolve(outputPath);

      // 形式の決定
      let format: ExportFormat;
      if (options?.format === 'auto') {
        format = OPMLService.detectFormat(outputPath);
      } else if (options?.format === 'opml' || options?.format === 'text') {
        format = options.format;
      } else {
        console.error(chalk.red('Invalid format. Use "opml" or "text"'));
        process.exit(1);
      }

      // 指定された形式でエクスポート
      let content: string;
      if (format === 'opml') {
        content = OPMLService.exportToOPML(feeds);
      } else {
        content = OPMLService.exportToText(feeds);
      }

      // ファイルに書き込み
      await fs.writeFile(absolutePath, content, 'utf-8');

      const formatName = format === 'opml' ? 'OPML' : 'text';
      console.log(
        chalk.green(`✓ Exported ${feeds.length} feeds to ${absolutePath} (${formatName} format)`)
      );
    } catch (error) {
      console.error(chalk.red('Error exporting feeds:'), error);
      process.exit(1);
    }
  });
