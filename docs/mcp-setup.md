# MCPサーバーのセットアップ方法

## Claude Desktopへの登録

### 方法1: claude mcp addコマンドを使用（開発版）

開発中のtermfeedをMCPサーバーとして登録する場合：

```bash
# リポジトリのパスを指定
claude mcp add --scope user termfeed -- npx tsx /path/to/termfeed/src/index.ts mcp-server
```

### 方法2: 設定ファイルを直接編集（推奨）

`~/.config/claude/claude_desktop_config.json`を編集：

```json
{
  "mcpServers": {
    "termfeed": {
      "command": "termfeed",
      "args": ["mcp-server"],
      "env": {}
    }
  }
}
```

開発版を使用する場合：

```json
{
  "mcpServers": {
    "termfeed": {
      "command": "npx",
      "args": ["tsx", "/Users/your-username/path/to/termfeed/src/index.ts", "mcp-server"],
      "env": {}
    }
  }
}
```

### 方法3: グローバルインストール後に登録

```bash
# termfeedをグローバルにインストール
npm install -g /path/to/termfeed

# Claude Desktopに登録
claude mcp add --scope user termfeed -- termfeed mcp-server
```

## 登録後の確認

1. Claude Desktopを再起動
2. 設定画面でMCPサーバーの一覧に「termfeed」が表示されることを確認

## 使用例

Claude Desktopで以下のように使用できます：

```
@termfeed:articles://unread        # 未読記事10件（デフォルト）
@termfeed:articles://unread?limit=20  # 未読記事20件（※現在動作しない可能性あり）
@termfeed:articles://favorites     # お気に入り記事
@termfeed:articles://article/123   # 記事ID 123の詳細（全文）
```

または自然言語で：
- 「termfeedの未読記事を見せて」
- 「お気に入りの記事を表示して」

## 注意事項

- 記事の内容は最大500文字に制限されています（詳細は個別記事リソースで取得）
- デフォルトの取得件数は10件です
- 大量の記事を取得するとClaude Desktopのコンテキストウィンドウを超える可能性があります

## トラブルシューティング

- サーバーが起動しない場合は、ターミナルで直接 `termfeed mcp-server` を実行してエラーを確認
- データベースファイルが見つからない場合は、`~/.termfeed/termfeed.db` が存在することを確認
- ログは標準エラー出力に出力されるので、Claude Desktopのログで確認可能