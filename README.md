# termfeed

ターミナルで動作するモダンなRSSリーダー

## 概要

termfeedは、ターミナル内で完全に動作するローカルRSSリーダーです。コマンドラインから離れることなく、高速でキーボード駆動のインターフェースでRSSフィードを管理・閲読できます。

## 主な機能

- 2ペインレイアウトのターミナルUI（フィード一覧：記事一覧 = 2:8）
- Vim風のキーボードナビゲーション（j/k/n/p/v）でサクサク操作
- ローカルSQLiteで記事、既読状態、お気に入りを管理
- コマンドラインからRSSフィードの追加・更新を実行
- MCP Server化によりClaude Codeから「今日の重要なニュース教えて」などの問い合わせが可能
- 完全ローカル動作で外部サービスに依存しない設計

## 技術スタック

- TypeScript
- Ink（ReactベースのターミナルUI）
- better-sqlite3
- axios

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/syou6162/termfeed.git
cd termfeed

# 依存関係のインストール
npm install

# ビルド
npm run build

# グローバルにインストール（オプション）
npm link
```

## 使い方

### CLIコマンド

#### フィードの管理

```bash
# RSSフィードを追加
termfeed add <RSS_URL>

# 例：はてなブックマークの人気エントリーを追加
termfeed add https://b.hatena.ne.jp/hotentry.rss

# フィード一覧を表示
termfeed list

# フィードを削除
termfeed rm <FEED_ID>
```

#### 記事の閲覧

```bash
# すべての記事を表示（最新10件）
termfeed articles

# 特定のフィードの記事を表示
termfeed articles --feed <FEED_ID>

# 未読記事のみ表示
termfeed articles --unread

# お気に入り記事のみ表示
termfeed articles --favorites

# 表示件数を指定
termfeed articles --limit 20
```

#### フィードの更新

```bash
# すべてのフィードを更新
termfeed update

# 特定のフィードのみ更新
termfeed update --feed <FEED_ID>
```

#### 記事の操作

```bash
# 記事を既読にする
termfeed read <ARTICLE_ID>

# 記事を未読に戻す
termfeed unread <ARTICLE_ID>

# お気に入りに追加/削除（トグル）
termfeed favorite <ARTICLE_ID>

# 記事の詳細を表示
termfeed show <ARTICLE_ID>
```

### データベースの場所

SQLiteデータベースはデフォルトで `./termfeed.db` に作成されます。
環境変数 `TERMFEED_DB` で場所を変更できます：

```bash
export TERMFEED_DB=/path/to/your/termfeed.db
```

## ライセンス

未定