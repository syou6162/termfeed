# termfeed MCPサーバー実装計画

## 概要

termfeedのデータをMCP（Model Context Protocol）経由でLLMエージェントに公開するサーバー機能を実装します。これにより、LLMがRSSフィードの記事情報を読み取り、ユーザーとの対話に活用できるようになります。

## 目的

- お気に入りした記事をLLMに読ませて深い議論をする
- 未読記事から興味深いトピックをピックアップしてもらう
- 自分の興味分野について、収集した記事を基に分析・洞察を得る

## アーキテクチャ

### 実行方式
- termfeedのサブコマンドとして実装：`termfeed mcp-server`
- 独立したプロセスとして起動し、stdioで通信

### 技術スタック
- TypeScript
- @modelcontextprotocol/sdk（公式SDK）
- 既存のtermfeedのサービス層を活用

## 提供するリソース

MCPのResources機能を使用して、以下の読み取り専用リソースを提供：

### 1. 未読記事リソース
- URI: `articles://unread?limit={n}`
- パラメータ:
  - `limit`: 取得する記事数（デフォルト: 50）
- 内容: 未読記事を新しい順にN件取得

### 2. お気に入り記事リソース
- URI: `articles://favorites?limit={n}`
- パラメータ:
  - `limit`: 取得する記事数（デフォルト: 50）
- 内容: お気に入り記事を新しい順にN件取得

### レスポンス形式
各記事には以下の情報を含む：
- title: 記事タイトル
- url: 記事URL
- summary: 記事の要約
- content: 記事本文（利用可能な場合）
- publishedAt: 公開日時
- feedTitle: フィード名
- author: 著者（利用可能な場合）

## 実装手順

### 1. プロジェクト準備
- [x] package.jsonに`@modelcontextprotocol/sdk`を追加
- [x] 必要な型定義を追加

### 2. ディレクトリ構造
- [x] src/mcp/ ディレクトリ作成
- [x] src/mcp/resources/ ディレクトリ作成
```
src/
├── mcp/
│   ├── server.ts          # MCPサーバーのメインロジック
│   ├── resources/
│   │   ├── articles.ts    # 記事リソースの実装
│   │   └── index.ts       # リソースのエクスポート
│   └── types.ts           # MCP関連の型定義
└── cli/
    └── commands/
        └── mcp-server.ts  # CLIコマンド実装
```

### 3. 実装詳細

#### MCPサーバー (src/mcp/server.ts)
- [x] McpServerインスタンスの作成
- [x] リソースの登録
- [x] StdioServerTransportでの通信設定
- [x] エラーハンドリング

#### 記事リソース (src/mcp/resources/articles.ts)
- [x] 未読記事と お気に入り記事のリソース実装
- [x] 既存のArticleModelを使用
- [x] URIパラメータのパース
- [x] データの取得とフォーマット
- [x] N+1クエリ回避の実装

#### CLIコマンド (src/cli/commands/mcp-server.ts)
- [x] サブコマンドの実装
- [x] Commanderでのコマンド登録
- [x] サーバーの起動
- [x] シグナルハンドリング（graceful shutdown）

### 4. 既存コードとの統合
- [x] DatabaseManagerを使用してデータベース接続
- [x] ArticleModelの既存メソッドを活用
- [x] CLIコマンドとして統合

### 5. テスト計画
- [x] MCPサーバーの起動/停止テスト
- [x] リソースの取得テスト（モックDB使用）
- [x] エラーケースのテスト
- [ ] 統合テスト（実際のデータベースでの動作確認）

## セキュリティ考慮事項
- ローカル環境での使用を前提
- 読み取り専用アクセス
- stdioを使用した安全な通信

## 今後の拡張可能性
- プロンプトテンプレートの追加（特定の分析タスク用）
- より高度なフィルタリング機能
- 記事の全文検索機能

## 使用例
```bash
# MCPサーバーを起動
termfeed mcp-server

# Claude DesktopなどのMCP対応クライアントから接続
# 「最近お気に入りした記事について教えて」
# 「未読記事の中から技術トレンドを分析して」
```
