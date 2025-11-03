---
inclusion: always
---

# 技術スタック

## コア技術

- **TypeScript**: 厳密な型チェックを有効にしたメイン言語
- **Node.js**: ランタイム環境（>=18.0.0が必要）
- **ES Modules**: インポート時に`.js`拡張子を使用するモダンなモジュールシステム
- **SQLite**: データ永続化のためのbetter-sqlite3によるローカルデータベース

## UIフレームワーク

- **Ink**: TUIコンポーネント用のReactベースターミナルUIフレームワーク
- **React**: 状態管理にフックを使用するコンポーネントアーキテクチャ
- **Commander.js**: CLI引数解析とコマンド構造

## 主要依存関係

- **better-sqlite3**: SQLiteデータベースインターフェース
- **axios**: RSSフィード取得用HTTPクライアント
- **rss-parser**: RSS/Atomフィード解析
- **@modelcontextprotocol/sdk**: MCPサーバー実装
- **chalk**: ターミナル色出力

## ビルドシステム

- **TypeScript Compiler**: ESモジュールへの直接tscコンパイル
- **tsx**: TypeScript実行用開発ランタイム
- **Vitest**: カバレッジレポート付きテストフレームワーク
- **ESLint + Prettier**: コード品質とフォーマット

## よく使うコマンド

```bash
# 開発
npm run dev              # 開発モードでCLI実行
npm run build           # TypeScriptをdist/にコンパイル
npm run start           # コンパイル済みCLI実行

# テスト
npm test                # ウォッチモードでテスト実行
npm run test:run        # テストを一度実行
npm run test:coverage   # カバレッジレポート生成

# コード品質
npm run lint            # ESLint実行
npm run lint:fix        # ESLintの問題を修正
npm run format          # Prettierでフォーマット
npm run typecheck       # 出力なしの型チェック

# データベース
npm run migrate         # データベースマイグレーション実行
```

## CI/CD

- **GitHub Actions**: 自動テスト、リント、型チェック、ビルドを実行
- **自動リリース**: タグプッシュ時にNPMへ自動公開（`v*`タグ）
- **品質チェック**: PR時にlint、test、typecheckが自動実行
- **手動公開不要**: `npm publish`は自動化済み

## 開発パターン

- **パスエイリアス**: srcルートインポートには`@/`、型インポートには`@/types`を使用
- **ファイル拡張子**: インポート時は常に`.js`拡張子を使用（TypeScript要件）
- **モジュール構造**: 名前付きエクスポートを優先するESモジュール
- **エラーハンドリング**: サービス層でカスタムエラークラスを使用
