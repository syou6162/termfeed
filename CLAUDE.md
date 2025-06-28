# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

termfeedは、ターミナルで動作するRSSリーダーです。Vim風のキーバインドと2ペインレイアウトのTUIを提供し、完全にローカルで動作します。

## アーキテクチャ

プロジェクトは3層アーキテクチャで構成されます：

- **src/models/**: データ層（型定義、データベース操作）
  - `DatabaseManager`: SQLite接続管理とマイグレーション
  - `FeedModel`: フィードのCRUD操作
  - `ArticleModel`: 記事のCRUD操作、既読管理、お気に入り機能
- **src/services/**: ビジネスロジック層（RSSクローラー、フィード管理）
- **src/cli/**: プレゼンテーション層（CLIコマンド、TUI）

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発モード（ファイル監視付き）
npm run dev

# ビルド
npm run build

# テスト実行
npm run test:run        # 単発実行
npm run test           # ウォッチモード
npm run test:coverage  # カバレッジ付き

# コード品質チェック
npm run lint           # ESLintチェック
npm run lint:fix       # ESLint自動修正
npm run format         # Prettier フォーマット
npm run typecheck      # TypeScript型チェック

# データベース
npm run migrate        # マイグレーション実行

# 単体テストの実行例
npm run test:run src/models/feed.test.ts
```

## データベース設計

SQLiteを使用し、以下のスキーマで構成（src/models/schema.sql）：

- **feeds**: RSSフィード管理
  - `id`, `url` (UNIQUE), `title`, `description`, `last_updated_at`, `created_at`
- **articles**: 記事管理
  - `id`, `feed_id` (FK), `title`, `url` (UNIQUE), `content`, `summary`, `author`
  - `published_at`, `is_read`, `is_favorite`, `thumbnail_url`, `created_at`, `updated_at`
  - インデックス: feed_id, published_at, is_read, is_favorite

### データベース設計の原則

- データベースはロジックではなく制約のみを持つ
- デフォルト値の設定、日時の自動更新などのロジックはアプリケーション側（JavaScript/TypeScript）で実装する
- SQLiteには秒単位のUNIXタイムスタンプを保存し、JavaScript側でミリ秒に変換する
- トリガーやデフォルト値などのDB側のロジックは使用しない

## 型定義の規約

- インターフェースではなくタイプ（type）を使用する
- 主要な型は `src/models/types.ts` に定義
  - `Feed`, `Article`, `CreateFeedInput`, `UpdateArticleInput`

## テスト戦略

- Vitestを使用
- 各モデルクラスに対応するテストファイルを作成
- テスト用データベースは各テストケースで独立して作成・削除
- 非同期処理のテストではsetTimeoutを避け、同期的にテストを記述

## CI/CD

GitHub Actionsで以下を実行：
- Lint（ESLint + Prettier）
- Test（Vitest）
- 型チェック（TypeScript）
- pre-commitフックでlintとtypecheckを実行