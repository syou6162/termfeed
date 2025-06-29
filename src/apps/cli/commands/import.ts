import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { DatabaseManager } from '../../../models/database.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedService } from '../../../services/feed-service.js';
import { OPMLService } from '../../../services/opml.js';
import { DuplicateFeedError } from '../../../services/errors.js';
import { createDatabaseManager } from '../utils/database.js';

export const importCommand = new Command('import')
  .description('Import feed subscriptions from OPML or text file')
  .argument('<file>', 'file to import')
  .option('-f, --format <format>', 'import format (opml or text)', 'auto')
  .action(async (file: string, options?: { format?: string }) => {
    let dbManager: DatabaseManager | null = null;

    try {
      const absolutePath = path.resolve(file);

      // ファイルの存在確認
      try {
        await fs.access(absolutePath);
      } catch {
        console.error(chalk.red(`File not found: ${absolutePath}`));
        process.exit(1);
      }

      // ファイルを読み込み
      const content = await fs.readFile(absolutePath, 'utf-8');

      // 形式の決定
      let format: 'opml' | 'text';
      if (options?.format === 'auto') {
        format = OPMLService.detectFormatFromContent(content);
      } else if (options?.format === 'opml' || options?.format === 'text') {
        format = options.format;
      } else {
        console.error(chalk.red('Invalid format. Use "opml" or "text"'));
        process.exit(1);
      }

      // URLを抽出
      let urls: string[];
      if (format === 'opml') {
        urls = OPMLService.parseOPML(content);
      } else {
        urls = OPMLService.parseText(content);
      }

      if (urls.length === 0) {
        console.log(chalk.yellow('No valid feed URLs found in the file'));
        return;
      }

      console.log(chalk.blue(`Found ${urls.length} feed URLs to import...`));

      // データベースとサービスの初期化
      dbManager = createDatabaseManager();
      dbManager.migrate();
      const feedModel = new FeedModel(dbManager);
      const articleModel = new ArticleModel(dbManager);
      const feedService = new FeedService(feedModel, articleModel);

      // 各URLを追加
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (const url of urls) {
        try {
          console.log(chalk.gray(`Adding ${url}...`));
          await feedService.addFeed(url);
          successCount++;
          console.log(chalk.green(`✓ Added ${url}`));
        } catch (error) {
          if (error instanceof DuplicateFeedError) {
            duplicateCount++;
            console.log(chalk.yellow(`⚠ Skipped (already exists): ${url}`));
          } else {
            errorCount++;
            console.error(chalk.red(`✗ Failed to add ${url}:`), error);
          }
        }
      }

      // 結果のサマリー
      console.log('\n' + chalk.bold('Import Summary:'));
      if (successCount > 0) {
        console.log(chalk.green(`✓ Successfully imported: ${successCount} feeds`));
      }
      if (duplicateCount > 0) {
        console.log(chalk.yellow(`⚠ Already existed: ${duplicateCount} feeds`));
      }
      if (errorCount > 0) {
        console.log(chalk.red(`✗ Failed to import: ${errorCount} feeds`));
      }
    } catch (error) {
      console.error(chalk.red('Error importing feeds:'), error);
      process.exit(1);
    } finally {
      if (dbManager) {
        dbManager.close();
      }
    }
  });
