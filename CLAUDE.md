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
- **FeedModel**: フィードのCRUD操作
- **ArticleModel**: 記事のCRUD操作、既読管理、お気に入り機能
  - `getUnreadCountsByFeedIds()`: N+1クエリ回避のバッチ処理メソッド
- **型定義**: `types.ts`にFeed, Articleなどの主要型を定義

### ビジネスロジック層 (src/services/)
- **RSSCrawler**: RSS/Atomフィードの取得・パース（rss-parser使用）
- **FeedService**: フィード管理とビジネスロジック（モデル層のラッパー）
  - `getUnreadCountsForAllFeeds()`: 全フィードの未読件数を一括取得
- **カスタムエラークラス**: 型安全なエラーハンドリング
  - RSSFetchError, RSSParseError, FeedUpdateError, DuplicateFeedError, FeedNotFoundError

### プレゼンテーション層
- **src/cli/commands/**: 各CLIサブコマンドの実装（add、list、articles、update、rm、tui）
- **src/tui/**: ターミナルUI実装（Ink/React）
  - `App.tsx`: メインコンポーネント、自動既読機能実装
  - `components/`: ArticleList, FeedList, TwoPaneLayout, HelpOverlay
  - `hooks/useKeyboardNavigation.ts`: キーバインド処理

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発モード（ファイル監視付き）
npm run dev
npm run dev tui  # TUIモード起動

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

# CLIコマンド例（開発時）
npm run dev add https://example.com/feed.rss
npm run dev list
npm run dev articles --unread
npm run dev tui  # TUIモード
```

## TUIアーキテクチャ

### キーバインド (src/tui/hooks/useKeyboardNavigation.ts)
- `j/k`: 記事移動（未読のみ）
- `s/a`: フィード移動（s=次、a=前）
- `v`: ブラウザで開く（spawn使用でセキュア実装）
- `f`: お気に入りトグル
- `r`: フィード更新
- `?`: ヘルプ表示
- `q`: 終了

### 自動既読機能
- フィード移動時（handleFeedSelectionChange）で現在記事を既読化
- アプリ終了時（handleQuit、SIGINT/SIGTERM）で既読化
- 既読化した記事は即座にリストから除外

### パフォーマンス最適化
- `getUnreadCountsForAllFeeds()`でN+1クエリ回避
- 未読フィードを上位にソート表示

## データベース設計

SQLiteを使用（src/models/schema.sql）：

### テーブル構造
- **feeds**: id, url (UNIQUE), title, description, last_updated_at, created_at
- **articles**: id, feed_id (FK), title, url (UNIQUE), content, summary, author, published_at, is_read, is_favorite, thumbnail_url, created_at, updated_at

### 設計原則
- データベースは制約のみ、ロジックはアプリケーション側
- UNIXタイムスタンプ（秒）で保存、JS側でミリ秒変換
- トリガー・デフォルト値は使用しない

## エラーハンドリング

カスタムエラークラスで型安全なエラーハンドリング：
- `message`を第一引数に統一
- `this.name = this.constructor.name`でクラス名自動設定
- `cause`プロパティでスタックトレース保持

## テスト戦略

- **フレームワーク**: Vitest
- **TUIテスト**: ink-testing-library使用
- **データベーステスト**: 各テストで独立したDB作成・削除
- **モック**: axios、child_processなど外部依存をモック

## セキュリティ実装

- URL実行時は`spawn`使用（`exec`は使用禁止）
- 引数は配列で分離してシェルインジェクション防止
- URLバリデーション（http/https のみ許可）

## エントリーポイント

- **メインファイル**: `src/index.ts`（シバン付き）
- **bin設定**: package.jsonで`termfeed`を`dist/index.js`にマッピング
- **開発時実行**: `npm run dev`でtsxを使用