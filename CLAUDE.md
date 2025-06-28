# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

termfeedは、ターミナルで動作するRSSリーダーです。Vim風のキーバインドと2ペインレイアウトのTUIを提供し、完全にローカルで動作します。

## アーキテクチャ

プロジェクトは3層アーキテクチャで構成されます：

- **src/models/**: データ層（型定義、データベース操作）
- **src/services/**: ビジネスロジック層（RSSクローラー、フィード管理）
- **src/cli/**: プレゼンテーション層（CLIコマンド、TUI）

## 技術スタック

- **言語**: TypeScript
- **TUI**: Ink（ReactベースのターミナルUI）
- **データベース**: better-sqlite3（同期API）
- **HTTPクライアント**: axios
- **テスト**: Jest または Vitest（予定）

## データベース設計

- **feeds**: id, url, title, last_updated_at
- **articles**: id, feed_id, title, url, content, published_at, is_read, is_favorite, thumbnail_url

## 開発コマンド（実装後に追加予定）

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lintチェック
npm run lint

# 型チェック
npm run typecheck
```

## 主要な機能

1. **RSSフィード管理**: フィードの追加・削除・更新
2. **記事管理**: 既読管理、お気に入り機能
3. **TUI**: 2ペインレイアウト、Vim風キーバインド（j/k/n/p/v）
4. **CLI**: コマンドラインからの操作
5. **MCP Server**: Claude Codeとの連携（将来実装）