---
inclusion: always
---

# プロジェクト構造

## ルートディレクトリ構成

```
src/
├── apps/           # アプリケーションエントリーポイント
├── models/         # データモデルとデータベース層
├── services/       # ビジネスロジックと外部統合
├── types/          # TypeScript型定義
├── test-helpers/   # 共有テストユーティリティ
├── index.ts        # メインCLIプログラムファクトリ
└── cli.ts          # CLIエントリーポイント
```

## アプリケーションアーキテクチャ

### アプリ層（`src/apps/`）
- **cli/**: コマンドラインインターフェース実装
  - `commands/`: 個別CLIコマンド（add、rm、list、tuiなど）
  - `utils/`: CLI固有のユーティリティ（データベース、バリデーション）
- **tui/**: ターミナルユーザーインターフェース（Ink/Reactコンポーネント）
  - `components/`: TUI用Reactコンポーネント
  - `hooks/`: 状態管理用カスタムReactフック
  - `types/`: TUI固有の型定義
  - `utils/`: TUIユーティリティ（ブラウザ統合、HTML処理）
- **mcp/**: Model Context Protocolサーバー
  - `resources/`: MCPリソースハンドラー
  - `tools/`: MCPツール実装

### データ層（`src/models/`）
- CRUD操作を持つデータベースモデル
- SQLiteスキーマとマイグレーション
- データベース接続管理
- 各モデルはデータベーステーブルに対応

### サービス層（`src/services/`）
- モデル上のビジネスロジック抽象化
- 外部API統合（RSSクローリング）
- サービスインターフェースと実装
- カスタムエラー定義

### 型層（`src/types/`）
- 一元化された型定義
- ドメインモデル、DTO、サービスインターフェース
- 関心事別に整理（domain、dto、options、services）

## 主要規約

### ファイル命名
- ファイルにはkebab-caseを使用: `feed-service.ts`、`article-list.tsx`
- テストファイル: `*.test.ts`または`*.test.tsx`
- コンポーネントファイル: ReactコンポーネントはPascalCase

### インポートパターン
- インポート時は常に`.js`拡張子を使用（TypeScript ESモジュール要件）
- パスエイリアスを使用: `@/types`、`@/models`、`@/services`
- 一元化された`@/types`モジュールから型をインポート

### テスト構造
- テストはソースファイルと同じ場所または`__tests__/`ディレクトリに配置
- スナップショットテストは`__snapshots__/`ディレクトリ
- テストユーティリティは`src/test-helpers/`
- テスト終了時にデータベースクリーンアップ

### コンポーネント構成
- TUIコンポーネントはReactフックパターンを使用
- 複雑な状態管理にはカスタムフック
- 関心の分離: UIはコンポーネント、ロジックはフック
- Propsインターフェースはインラインまたはコンポーネントファイル内で定義
