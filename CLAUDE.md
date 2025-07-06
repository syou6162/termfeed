# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

termfeedは、ターミナルで動作するRSSリーダーです。Vim風のキーバインドと2ペインレイアウトのTUIを提供し、完全にローカルで動作します。

## アーキテクチャ

プロジェクトは3層アーキテクチャで構成されます：

### データ層 (src/models/)
- **DatabaseManager**: SQLite接続管理とマイグレーション
  - `migrate()`: schema.sqlを実行してテーブル作成
  - 開発時とビルド後で異なるパス解決を実装
- **FeedModel**: フィードのCRUD操作、レーティング管理
  - `setRating()`: 0-5の範囲でフィードレーティングを設定
- **ArticleModel**: 記事のCRUD操作、既読管理
  - `getUnreadCountsByFeedIds()`: N+1クエリ回避のバッチ処理メソッド
  - `count()`: 記事の総数を取得
  - `findAllWithPinStatus()`: LEFT JOINでピン状態を含む記事取得
  - `getPinnedArticles()`: INNER JOINでピン留めされた記事のみ取得
  - `getFavoriteArticles()`: INNER JOINでお気に入り記事を取得
- **FavoriteModel**: お気に入り機能のCRUD操作
  - `create()`: 記事をお気に入りに追加（UNIQUE制約で重複防止）
  - `delete()`: お気に入りから削除
  - `isFavorite()`: お気に入り状態の確認
  - `getFavoriteCount()`: お気に入り数を取得
- **PinModel**: ピン機能のCRUD操作
  - `create()`: 記事にピンを立てる（UNIQUE制約で重複防止）
  - `delete()`: ピンを外す
  - `isPinned()`: ピン状態の確認

### ビジネスロジック層 (src/services/)
- **factory.ts**: サービス層のファクトリー関数（レイヤリング保持のため重要）
  - `createFeedServices()`: FeedService単体のファクトリー
  - `createModelsAndServices()`: 個別モデルも必要な場合のファクトリー
- **RSSCrawler**: RSS/Atomフィードの取得・パース（rss-parser使用）
- **FeedService**: フィード管理とビジネスロジック
  - `implements IFeedService`で型安全性を保証
  - `getUnreadCountsForAllFeeds()`: 全フィードの未読件数を一括取得
  - `setFeedRating()`: フィードレーティング設定
  - `getUnreadFeeds()`: レーティング優先・未読件数副次のソート
- **ArticleService**: 記事管理のビジネスロジック（ArticleModelのラッパー）
  - `toggleFavoriteWithPin()`: お気に入りとピンを連動させる（FavoriteServiceと連携）
- **FavoriteService**: お気に入り機能のビジネスロジック
  - `toggleFavorite()`: お気に入り状態の切り替え（戻り値で追加/削除を判定）
  - `addFavorite()`: お気に入りに追加
  - `removeFavorite()`: お気に入りから削除
  - `isFavorite()`: お気に入り状態の確認
  - `getFavoriteCount()`: お気に入り数を取得
- **PinService**: ピン機能のビジネスロジック
  - `togglePin()`: ピン状態の切り替え（戻り値でピン/アンピンを判定）
  - `getPinnedArticles()`: ピン留めされた記事を取得（作成日時の降順）
  - `getOldestPinnedArticles(limit: number)`: 古い順にピン記事を取得
  - `getPinCount()`: ピン数を取得
  - `deletePins(articleIds: number[])`: 複数のピンを一括削除
  - `clearAllPins()`: すべてのピンをクリア（内部用）
- **カスタムエラークラス**: 型安全なエラーハンドリング
  - RSSFetchError, RSSParseError, FeedUpdateError, DuplicateFeedError, FeedNotFoundError

### プレゼンテーション層 (src/apps/)
- **src/apps/cli/commands/**: 各CLIサブコマンドの実装（add、list、rm、tui、export、import、mcp-server、tutorial）
  - **注意**: CLIコマンドは`createFeedServices()`または`createModelsAndServices()`を使用すること
- **src/apps/cli/utils/**: CLIユーティリティ
  - `tui-launcher.ts`: TUI起動とRaw modeクリーンアップの共通処理
  - `database.ts`: DatabaseManager作成ユーティリティ
- **src/apps/tui/**: ターミナルUI実装（Ink/React）
  - `App.tsx`: メインコンポーネント、自動既読機能実装
    - `AppProps`型でDatabaseManagerを外部から注入可能（チュートリアルモード用）
  - `components/`: ArticleList, FeedList, FavoriteList, TwoPaneLayout, HelpOverlay
    - `FavoriteList`: お気に入り記事専用の1ペイン表示コンポーネント
  - `hooks/useKeyboardNavigation.ts`: キーバインド処理
  - `hooks/useFeedManager.ts`: フィード選択状態の自動同期
  - `hooks/usePinManager.ts`: ピン状態管理（pinnedArticleIds Set管理）
  - `hooks/useTermfeedData.ts`: DatabaseManagerとサービスの初期化
    - `databaseManager`プロパティを返す（`db`ではない）
    - 外部から注入されたDatabaseManagerがある場合はマイグレーションをスキップ
  - `utils/browser.ts`: 複数URL対応のブラウザ起動ユーティリティ
- **src/apps/mcp/**: Model Context Protocolサーバー実装
  - AI連携用のリソースプロバイダー

### 型定義 (src/types/)
すべての型定義を集約管理：
- **domain.ts**: DBエンティティ（Feed, Article, Pin, Favorite）
  - `Feed.rating`: 0-5の整数値（必須）
  - `Pin`: article_id, created_atを持つピン情報
  - `Favorite`: article_id, created_atを持つお気に入り情報
- **dto.ts**: データ転送オブジェクト（RSSItem, CrawlResult）
- **options.ts**: 関数引数・設定（ArticleQueryOptions, ServiceError）
- **services.ts**: サービス層のインターフェース
- 詳細は [src/types/README.md](src/types/README.md) 参照

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発モード（ファイル監視付き）
npm run dev
npm run dev tui  # TUIモード起動
npm run dev tutorial  # チュートリアルモード起動

# ビルド
npm run build

# テスト実行
npm run test:run        # 単発実行
npm run test           # ウォッチモード
npm run test:coverage  # カバレッジ付き
npm run test:run src/models/feed.test.ts  # 単体テスト実行

# コード品質チェック（pre-commitフックで自動実行）
npm run lint           # ESLintチェック
npm run lint:fix       # ESLint自動修正
npm run format         # Prettier フォーマット
npm run typecheck      # TypeScript型チェック

# データベースの初期化（初回セットアップ時）
npm run migrate  # schema.sqlを実行してテーブル作成

# CLIコマンド例（開発時）
npm run dev add https://example.com/feed.rss
npm run dev list  # フィード一覧表示
npm run dev rm 1  # フィードID=1を削除
npm run dev tui  # TUIモード
npm run dev tutorial  # チュートリアルモード（インメモリDB）
npm run dev export feeds.opml
npm run dev import feeds.txt
npm run dev mcp-server  # MCPサーバー起動
```

## TUIアーキテクチャ

### キーバインド (src/tui/hooks/useKeyboardNavigation.ts)
- `j/k`: 記事移動（未読のみ）
- `s/a`: フィード移動（s=次、a=前）
- `v`: ブラウザで開く（spawn使用でセキュア実装）
- `f`: お気に入りトグル（自動でピンも設定、v0.4.0〜）
- `Shift+F`: お気に入り一覧表示に切り替え
- `p`: ピントグル（後で読む記事をマーク）
- `o`: ピンした記事をまとめてブラウザで開く（最大10件ずつ、古い順）
- `g`: 記事内の先頭へスクロール
- `G`: 記事内の末尾へスクロール
- `Space`: 記事内でページダウン
- `e`: エラー詳細表示トグル
- `r`: 全フィード更新
- `0-5`: フィードレーティング設定
- `?`: ヘルプ表示
- `q`: 終了

### レーティング機能
- レーティング別セクション表示（折りたたみ式）
- 現在選択中のセクションのみ展開
- フィード一覧は30%、記事詳細は70%のレイアウト
- `useFeedManager`がレーティング変更後の選択状態を自動同期

### 自動既読機能
- フィード移動時（handleFeedSelectionChange）で現在記事を既読化
- アプリ終了時（handleQuit、SIGINT/SIGTERM）で既読化
- 既読化した記事は即座にリストから除外

### ピン機能
- `p`キーで記事にピンを立てる（後で読む記事をマーク）
- `o`キーでピンした記事をまとめてブラウザで開く
  - 最大10件ずつ古い順に開く（FIFO）
  - 複数回`o`キーを押すことで次の10件を開ける
  - 開いた記事のピンは自動的に解除される
  - 一部のURLが開けなくても成功したURLのピンは解除
- フィード一覧にピン総数を表示（フィード横断情報）
- 一時的なメッセージ表示（3秒で自動消去）
- **お気に入りとピンの連動**（v0.4.0〜）
  - `f`キーでお気に入り追加時に自動でピンも設定
  - お気に入りを外すとピンも解除される

### お気に入り一覧表示
- `Shift+F`キーでお気に入り記事専用の1ペイン表示に切り替え
- 記事のスクロール、ピン、お気に入り解除などの操作が可能
- 通常の2ペイン表示に戻るには再度`Shift+F`キーを押す

### パフォーマンス最適化
- `getUnreadCountsForAllFeeds()`でN+1クエリ回避
- レーティング優先・未読件数副次のソート表示

### プロセスクリーンアップの役割分担
- **tui-launcher.ts**: InkのRaw modeクリーンアップ専用（ターミナル状態のリセット）
- **App.tsx内のSIGINT/SIGTERMハンドラー**: 既読化処理専用
- 両者は異なる目的のため、両方必要

## データベース設計

SQLiteを使用（src/models/schema.sql）：

### テーブル構造
- **feeds**: id, url (UNIQUE), title, description, rating (INTEGER DEFAULT 0), last_updated_at, created_at
- **articles**: id, feed_id (FK), title, url (UNIQUE), content, summary, author, published_at, is_read, thumbnail_url, created_at, updated_at
  - 注意: `is_favorite`カラムはfavoritesテーブルへ移行済み（v0.5.0〜）
- **pins**: id, article_id (FK UNIQUE), created_at
  - 外部キー制約でarticle削除時に自動削除（ON DELETE CASCADE）
- **favorites**: id, article_id (FK UNIQUE), created_at
  - 外部キー制約でarticle削除時に自動削除（ON DELETE CASCADE）

### インデックス
- `idx_feeds_rating`: レーティングでの高速ソート
- `idx_articles_feed_id`: フィード別記事の高速取得
- `idx_articles_is_read`: 未読記事の高速フィルタリング
- `idx_pins_article_id`: ピン状態の高速確認
- `idx_pins_created_at`: ピン作成日時でのソート用
- `idx_favorites_article_id`: お気に入り状態の高速確認
- `idx_favorites_created_at`: お気に入り作成日時でのソート用

### 設計原則
- データベースは制約のみ、ロジックはアプリケーション側
- UNIXタイムスタンプ（秒）で保存、JS側でミリ秒変換
- トリガー・デフォルト値は使用しない

## エラーハンドリング

カスタムエラークラスで型安全なエラーハンドリング：
- `message`を第一引数に統一
- `this.name = this.constructor.name`でクラス名自動設定
- `cause`プロパティでスタックトレース保持
- **複数URL処理**: `OpenUrlResult`型で成功/失敗を個別管理
  - 一部失敗しても成功したURLの処理は継続
  - エラーオブジェクトに詳細情報（result）を付加

## テスト戦略

### テストフレームワーク
- **Vitest**: ユニットテスト・統合テスト
- **ink-testing-library**: TUIコンポーネントテスト
- **Commander.js**: CLIコマンドのE2Eテスト

### 各レイヤーのテスト方針

#### データ層 (src/models/)
**書くべきテスト**:
- CRUDメソッドの基本動作（create, findById, update, delete）
- データベース制約の検証（UNIQUE制約、外部キー制約）
- タイムスタンプ変換の正確性
- SQLエラーハンドリング（存在しないID、重複データ）

**書くべきでないテスト**:
- ビジネスロジックのテスト（サービス層で実施）
- 外部サービスとの連携テスト
- UI関連のテスト

**実装パターン**:
```typescript
beforeEach(() => {
  db = new DatabaseManager(testDbPath);
  db.migrate();
  feedModel = new FeedModel(db);
});
```

#### ビジネスロジック層 (src/services/)
**書くべきテスト**:
- ビジネスロジックの全体フロー（フィード追加・更新処理）
- 複数モデルの協調動作（カスケード削除など）
- カスタムエラーのハンドリング
- 外部サービスのモック（RSSCrawler）
- 進捗コールバックとキャンセル機能

**書くべきでないテスト**:
- データベースへの直接アクセス
- 実際のHTTPリクエスト（必ずモック）
- UI表示の詳細

**モックの例**:
```typescript
mockCrawler = { crawl: vi.fn() } as unknown as RSSCrawler;
vi.mocked(mockCrawler.crawl).mockResolvedValueOnce(mockData);
```

#### プレゼンテーション層 - CLI (src/apps/cli/)
**書くべきテスト**:
- E2Eテスト（コマンド実行から出力まで）
- エラーメッセージの適切性
- 終了コード（成功: undefined、エラー: 1）
- 出力フォーマットのスナップショット

**書くべきでないテスト**:
- モデル層の詳細な動作
- ビジネスロジックの内部実装

**テストヘルパー**:
```typescript
const context = createTestContext();
const output = await runCommand(['add', url], { dbPath: context.dbPath });
expect(output.stdout).toMatchSnapshot();
```

#### プレゼンテーション層 - TUI (src/apps/tui/)
**書くべきテスト**:
- キーボード操作の統合テスト
- 状態管理（選択、既読、ピン）
- エラー表示とローディング状態
- コンポーネント間の連携

**書くべきでないテスト**:
- console.logの詳細な出力（実装詳細に依存）
- ビジネスロジックの詳細
- 実際のデータベース操作

**実装パターン**:
```typescript
const { stdin, lastFrame } = render(<App />);
stdin.write('j'); // 次の記事へ
await vi.waitFor(() => {
  expect(lastFrame()).toContain('Article 1');
});
```

### テストで避けるべきパターン

1. **実装詳細への依存**
   ```typescript
   // 悪い例
   expect(component.state.selectedIndex).toBe(1);
   // 良い例
   expect(lastFrame()).toContain('選択された記事');
   ```

2. **脆弱なテスト**
   - 出力フォーマットの細かい変更で壊れる
   - タイミングに依存する
   - 内部状態に依存する

3. **メンテナンス困難なテスト**
   - 巨大な単一テスト
   - 重複したセットアップ
   - モックの過剰使用

### モックの注意点
- **ArticleModelのモック**: TUIテストではgetPinnedArticlesメソッドを含める
  ```typescript
  vi.mock('../../models/article.js', () => ({
    ArticleModel: vi.fn(() => ({
      getPinnedArticles: vi.fn(() => []),
    })),
  }));
  ```

## セキュリティ実装

- URL実行時は`spawn`使用（`exec`は使用禁止）
- 引数は配列で分離してシェルインジェクション防止
- URLバリデーション（http/https のみ許可）

## エントリーポイント

- **メインファイル**: `src/index.ts`（シバン付き）
- **bin設定**: package.jsonで`termfeed`を`dist/cli.js`にマッピング
- **開発時実行**: `npm run dev`でtsxを使用

## チュートリアルモード

インメモリDBを使用した試用モード（初回推奨）：
- `termfeed tutorial`または`npm run dev tutorial`で起動
- サンプルフィード4つが自動登録済み：
  - Hacker News (Best Stories)
  - Dev.to
  - The Verge
  - TechCrunch
- データは終了時に破棄される（お試しに最適）
- フィード登録の手間なく、すぐにtermfeedの機能を体験可能
- 実装は`src/apps/cli/commands/tutorial.tsx`

## 注意事項

### 現在の課題
- 一部のCLIコマンドのテストカバレッジが低い（mcp-server.ts: 30.55%、tui.tsx: 56.25%）
- App.tsxが大きすぎる（424行）

### データベースファイルパス
- デフォルト: XDG Base Directory準拠 (`~/.local/share/termfeed/termfeed.db`)
- 環境変数 `TERMFEED_DB` で変更可能
- テスト時は一時ファイルを使用（インメモリDBは未実装）

### レイヤリング原則
- CLIコマンドからモデル層への直接アクセスは禁止
- 必ず`createFeedServices()`または`createModelsAndServices()`を使用
- 依存関係: CLI → Services → Models

## 開発時の重要な注意事項

### 1. コード品質の維持
- **必ずリントを通す**: ファイル修正後は毎回 `npm run lint` を実行
- **必ずテストを通す**: 変更に関連するテストは必ず実行（`npm run test:run`）
- **型チェックも忘れずに**: `npm run typecheck` で型エラーがないことを確認

### 2. Gitコミットの原則
- **意味のある最小単位でコミット**: 各コミットは1つの論理的な変更を表す
- **異なる目的の変更を混ぜない**: 機能追加とリファクタリングは別コミット
- **頻繁にコミット**: ただし、変更のたびではなく意味のある単位で

**良いコミットの例**:
```bash
# 機能追加
git add src/services/pin-service.ts src/services/pin-service.test.ts
git commit -m "feat: PinServiceにgetOldestPinnedArticlesメソッドを追加"

# バグ修正
git add src/models/article.ts
git commit -m "fix: ArticleModelのタイムスタンプ変換エラーを修正"

# リファクタリング
git add src/apps/tui/hooks/useKeyboardNavigation.ts
git commit -m "refactor: キーボードナビゲーションの重複コードを削除"
```

**悪いコミットの例**:
```bash
# 複数の目的が混在
git add .
git commit -m "機能追加とバグ修正とリファクタリング"

# コミットが大きすぎる
git add src/**/*.ts
git commit -m "大量の変更"

# 意味のない単位
git add src/models/feed.ts
git commit -m "一行修正"
git add src/models/feed.ts
git commit -m "もう一行修正"
```

### 3. pre-commitフックの活用
- プロジェクトにはpre-commitフックが設定されている
- コミット前に自動でlint、format、typecheckが実行される
- フックが失敗した場合は、エラーを修正してから再度コミット

## 新機能追加時の注意点

### CLIコマンド追加時
1. `src/apps/cli/commands/`に実装ファイルを作成
2. `createXXXCommand`関数として実装（Commander.jsのCommandオブジェクトを返す）
3. `src/apps/cli/commands/index.ts`でエクスポート
4. `src/index.ts`の`createMainProgram`関数でコマンド登録
5. E2Eテストを`src/apps/cli/__tests__/commands/`に作成
6. ヘルプのスナップショットテストを更新（`npm run test:run src/apps/cli/__tests__/commands/help.e2e.test.ts -- -u`）

### 新しいデータモデル追加時
1. `src/models/schema.sql`にテーブル定義追加
2. `src/types/domain.ts`に型定義追加
3. `src/models/`に対応するModelクラス作成
4. 必要に応じて`src/services/`にServiceクラス作成
5. `src/services/factory.ts`でファクトリー関数を更新

### テスト作成時の注意
- E2Eテストは`createTestContext()`を使用して独立したDB環境を作成
- ビルド済みファイルを使うテストは`npm run build`後に実行
- TUIコンポーネントのテストは`ink-testing-library`を使用
- モックする際は適切なメソッドを含める（特に`getPinnedArticles`など）