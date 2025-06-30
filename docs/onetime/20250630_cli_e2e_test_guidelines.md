# CLI E2Eテスト実装ガイドライン

このドキュメントは、termfeedプロジェクトにおけるCLIコマンドのエンドツーエンド（E2E）テストを正しく実装するためのガイドラインです。

## 概要

### E2Eテストの目的
- CLIコマンドが実際のユーザー操作と同じように動作することを検証
- コマンドライン引数の解析から、出力、終了コードまでの全体的な動作を確認
- 内部実装の詳細に依存せず、外部から見た振る舞いをテスト

### 対象範囲
- CLIコマンド（add, rm, export, import）
- TUIとMCP-serverは本ガイドラインの対象外（別途対応）
- インメモリデータベースへの移行は将来課題として保留

### 従来のアプローチとの違い

#### ❌ 従来のアプローチ（アンチパターン）
```typescript
// アクション関数を抽出して直接テスト
async function addFeedAction(url: string, dbPath: string) {
  // 内部ロジックを直接呼び出し
  const dbManager = createDatabaseManager();
  const feedService = new FeedService(/* ... */);
  return await feedService.addFeed(url);
}

it('should add feed', async () => {
  const result = await addFeedAction(url, dbPath);
  expect(result.feed.url).toBe(url);
});
```

#### ✅ 推奨されるE2Eアプローチ
```typescript
// Commander.jsを通して実際のコマンドを実行
it('should add feed via CLI', async () => {
  const { stdout, stderr, exitCode } = await runCommand([
    'add', 
    'https://example.com/feed.rss'
  ]);
  
  // 副作用を検証
  const feeds = testContext.feedModel.findAll();
  expect(feeds).toHaveLength(1);
  expect(exitCode).toBe(0);
});
```

## 実装手順

### 1. テスト環境のセットアップ

#### テストコンテキストの作成
```typescript
// test-helpers/context.ts
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DatabaseManager } from '@/models/database.js';

export interface TestContext {
  tempDir: string;
  dbPath: string;
  database: DatabaseManager;
  feedModel: FeedModel;
  articleModel: ArticleModel;
  cleanup: () => void;
}

export function createTestContext(): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'termfeed-test-'));
  const dbPath = join(tempDir, 'test.db');
  
  const database = new DatabaseManager(dbPath);
  database.migrate();
  
  const feedModel = new FeedModel(database);
  const articleModel = new ArticleModel(database);
  
  return {
    tempDir,
    dbPath,
    database,
    feedModel,
    articleModel,
    cleanup: () => {
      database.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  };
}
```

### 2. コマンド実行ヘルパーの実装

```typescript
// test-helpers/cli-runner.ts
import { Writable, PassThrough } from 'stream';
import { Command } from 'commander';

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}

export async function runCommand(
  args: string[],
  options: {
    dbPath: string;
    env?: Record<string, string>;
  }
): Promise<CommandOutput> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const outputs = { stdout: '', stderr: '' };
  
  // 出力をキャプチャ
  stdout.on('data', (chunk) => { outputs.stdout += chunk; });
  stderr.on('data', (chunk) => { outputs.stderr += chunk; });
  
  // 環境変数を設定
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    ...options.env,
    TERMFEED_DB: options.dbPath,
  };
  
  // process.exitをモック
  let exitCode: number | undefined;
  const originalExit = process.exit;
  process.exit = ((code?: number) => {
    exitCode = code;
    throw new Error('process.exit called');
  }) as never;
  
  // console出力をリダイレクト
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => stdout.write(args.join(' ') + '\n');
  console.error = (...args) => stderr.write(args.join(' ') + '\n');
  
  try {
    // メインプログラムを実行
    const program = createMainProgram(); // index.tsからexportする必要あり
    await program.parseAsync(['node', 'termfeed', ...args]);
  } catch (error) {
    // process.exitによる例外は無視
    if (error.message !== 'process.exit called') {
      throw error;
    }
  } finally {
    // 環境を復元
    process.env = originalEnv;
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  }
  
  return {
    stdout: outputs.stdout,
    stderr: outputs.stderr,
    exitCode,
  };
}
```

### 3. モックの設定

```typescript
// test-helpers/mocks.ts
import { vi } from 'vitest';
import { RSSCrawler } from '@/services/rss-crawler.js';

export function setupRSSCrawlerMock() {
  const crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');
  
  return {
    crawlSpy,
    mockFeedResponse(url: string, data: CrawlResult) {
      crawlSpy.mockImplementation(async (feedUrl) => {
        if (feedUrl === url) {
          return data;
        }
        throw new Error(`Unexpected URL: ${feedUrl}`);
      });
    },
    mockError(error: Error) {
      crawlSpy.mockRejectedValue(error);
    },
  };
}
```

### 4. 各コマンドのE2Eテスト実装

#### addコマンドの例
```typescript
// __tests__/commands/add.e2e.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContext, runCommand, setupRSSCrawlerMock } from '../test-helpers';
import { createMockRSSData } from '../test-helpers/mock-data';

describe('add command E2E', () => {
  let context: TestContext;
  let rssMock: ReturnType<typeof setupRSSCrawlerMock>;
  
  beforeEach(() => {
    context = createTestContext();
    rssMock = setupRSSCrawlerMock();
  });
  
  afterEach(() => {
    context.cleanup();
    vi.restoreAllMocks();
  });
  
  it('should add RSS feed successfully', async () => {
    // Arrange
    const feedUrl = 'https://example.com/feed.rss';
    const mockData = createMockRSSData({
      title: 'Test Feed',
      description: 'Test Description',
      feedUrl,
    });
    rssMock.mockFeedResponse(feedUrl, mockData);
    
    // Act
    const output = await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });
    
    // Assert - 終了コード
    expect(output.exitCode).toBeUndefined(); // 正常終了
    
    // Assert - 出力のスナップショット
    expect(output.stdout).toMatchSnapshot('add-success-output');
    
    // Assert - データベースの状態（コンテキストのモデルを使って検証）
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toMatchObject({
      url: feedUrl,
      title: 'Test Feed',
      description: 'Test Description',
    });
    
    const articles = context.articleModel.findAll();
    expect(articles).toHaveLength(2); // モックデータのデフォルト
  });
  
  it('should handle network errors gracefully', async () => {
    // Arrange
    const feedUrl = 'https://example.com/error.rss';
    rssMock.mockError(new Error('Network error'));
    
    // Act
    const output = await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });
    
    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error adding feed');
    
    // データベースに何も追加されていないことを確認
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(0);
  });
});
```

## 推奨プラクティス

### 1. 副作用の検証を重視
- データベースやファイルの状態を検証（サービス層/モデル層を使用）
- 終了コードで成功/失敗を判断
- 標準出力はスナップショットテストで検証

### 2. 適切なモックの使用
- 外部依存（RSS取得、ファイルI/O）はモック
- データベースは実際のSQLiteファイルを使用（テンポラリ）

### 3. テストの独立性
- 各テストで新しいデータベースとコンテキストを作成
- テスト間で状態を共有しない

### 4. エラーケースの網羅
- 正常系だけでなく、異常系も必ずテスト
- ネットワークエラー、無効な引数、ファイル権限エラーなど

### 5. スナップショットテストの活用
```typescript
// 出力の一貫性を保証
expect(output.stdout).toMatchSnapshot('command-name-scenario');
expect(output.stderr).toMatchSnapshot('error-scenario');

// 動的な値が含まれる場合は正規化
const normalizedOutput = output.stdout
  .replace(/ID: \d+/g, 'ID: [ID]')
  .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]');
expect(normalizedOutput).toMatchSnapshot();
```

## アンチパターン

### ❌ 避けるべきパターン

#### 1. 内部実装の直接呼び出し
```typescript
// 悪い例
const feedService = new FeedService(/* ... */);
const result = await feedService.addFeed(url);
```

#### 2. 出力文字列の詳細なマッチング
```typescript
// 悪い例
expect(stdout).toBe('Adding feed: https://example.com/feed.rss\nFeed added successfully!\n  ID: 1\n');
```

#### 3. グローバル状態の変更
```typescript
// 悪い例
process.env.TERMFEED_DB = '/tmp/test.db'; // 復元を忘れがち
```

#### 4. モックの過剰な使用
```typescript
// 悪い例
vi.mock('../../../models/database.js'); // データベース全体をモック
```

### ✅ 推奨パターン

#### 1. CLIを通した実行
```typescript
// 良い例
const output = await runCommand(['add', url], { dbPath });
```

#### 2. 適切な検証の組み合わせ
```typescript
// 良い例
expect(output.exitCode).toBe(0);
expect(output.stdout).toMatchSnapshot(); // 出力の一貫性
expect(context.feedModel.findAll()).toHaveLength(1); // 副作用の検証
```

#### 3. 適切な環境の分離
```typescript
// 良い例
const context = createTestContext(); // 独立した環境
```

#### 4. 最小限のモック
```typescript
// 良い例
vi.spyOn(RSSCrawler.prototype, 'crawl'); // 外部通信のみモック
```

## チェックリスト

### E2Eテスト実装時の確認項目

- [ ] Commander.jsを通してコマンドを実行しているか
- [ ] process.exitを適切にハンドリングしているか
- [ ] 標準出力/エラー出力をキャプチャしているか
- [ ] テンポラリデータベースを使用しているか
- [ ] 各テストが独立して実行可能か
- [ ] 外部依存（ネットワーク、ファイルシステム）を適切にモックしているか
- [ ] 正常系と異常系の両方をテストしているか
- [ ] データベースやファイルの副作用を検証しているか（モデル/サービス層を使用）
- [ ] 標準出力/エラー出力のスナップショットテストを含めているか
- [ ] テスト後のクリーンアップを行っているか

### レビュー時の観点

- [ ] コマンドの実行はCommander.js経由で行われているか
- [ ] 副作用の検証に生のSQLではなくモデル/サービス層を使っているか
- [ ] 出力の検証にスナップショットテストを活用しているか
- [ ] テストが脆くないか（実装の些細な変更で壊れないか）
- [ ] エラーケースが網羅されているか
- [ ] テストコードが読みやすく、意図が明確か

## まとめ

E2Eテストは、ユーザーの視点でCLIツールの動作を検証する重要なテストです。内部実装の詳細に依存せず、コマンドの入力から出力、副作用までを包括的にテストすることで、リファクタリングに強く、信頼性の高いテストスイートを構築できます。

このガイドラインに従うことで、termfeedプロジェクトのCLIコマンドに対して、一貫性があり保守しやすいE2Eテストを実装できるようになります。