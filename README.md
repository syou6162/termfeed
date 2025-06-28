# termfeed

ターミナルで動作するモダンなRSSリーダー

## 概要

termfeedは、ターミナル内で完全に動作するローカルRSSリーダーです。コマンドラインから離れることなく、高速でキーボード駆動のインターフェースでRSSフィードを管理・閲読できます。

## 主な機能

### 🎯 ターミナルUI（メイン機能）
- **2ペインレイアウト**: 左側フィード一覧（20%）、右側記事詳細（80%）
- **Vim風キーバインド**: j/k（記事移動）、s/a（フィード移動）、v（ブラウザ開く）
- **自動既読機能**: フィード移動時・アプリ終了時の自動既読化
- **未読記事フォーカス**: 未読記事のみナビゲーション、既読化で自動除外
- **ヘルプオーバーレイ**: ?キーでキーボードショートカット一覧表示

### ⚙️ CLI管理機能
- コマンドラインからRSSフィードの追加・更新・削除
- 記事の既読管理、お気に入り機能
- バッチ処理による高速フィード更新

### 💾 データ管理
- ローカルSQLiteで記事、既読状態、お気に入りを管理
- 完全ローカル動作で外部サービスに依存しない設計
- MCP Server化によりClaude Codeからの問い合わせ対応

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

### ターミナルUI（推奨）

#### 起動

```bash
# TUIモードでRSSリーダーを起動
termfeed tui
```

#### キーボード操作

| キー | 機能 |
|------|------|
| `j` / `↓` | 次の記事に移動（未読のみ） |
| `k` / `↑` | 前の記事に移動（未読のみ） |
| `s` | 次のフィードに移動 |
| `a` | 前のフィードに移動 |
| `v` | 選択記事をブラウザで開く（バックグラウンド） |
| `f` | お気に入り切り替え |
| `r` | 全フィードを更新 |
| `?` | ヘルプ表示/非表示 |
| `q` | 終了 |
| `Ctrl+C` | 強制終了 |

#### 特徴

- **自動既読化**: フィード移動時（s/a）や終了時（q）に選択中の記事が自動的に既読になります
- **未読フォーカス**: j/kで移動できるのは未読記事のみ。既読になった記事は自動的にリストから除外されます
- **フィード優先表示**: 未読記事があるフィードが上位に表示され、効率的にチェックできます
- **バックグラウンドブラウザ**: vキーでブラウザを開いてもターミナルのフォーカスが維持されます

### CLIコマンド（管理用）

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

#### フィードのエクスポート/インポート

```bash
# フィードをOPML形式でエクスポート（デフォルト）
termfeed export
# -> subscriptions.opml に出力

# ファイル名を指定してエクスポート
termfeed export my-feeds.opml

# テキスト形式（1行1URL）でエクスポート
termfeed export feeds.txt --format text

# 拡張子から自動判別（.txt → テキスト形式）
termfeed export feeds.txt

# OPMLファイルからインポート
termfeed import subscriptions.opml

# テキストファイルからインポート（1行1URL）
termfeed import feeds.txt

# フォーマットを明示的に指定
termfeed import feeds.xml --format opml
```

**対応フォーマット：**
- **OPML形式**: 標準的なRSSリーダー間でのデータ移行に使用（.opml, .xml）
- **テキスト形式**: シンプルな1行1URLのフォーマット。コメント行（#で始まる）対応

### データベースの場所

SQLiteデータベースはデフォルトで `./termfeed.db` に作成されます。
環境変数 `TERMFEED_DB` で場所を変更できます：

```bash
export TERMFEED_DB=/path/to/your/termfeed.db
```

## ライセンス

未定