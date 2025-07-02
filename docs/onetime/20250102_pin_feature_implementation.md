# ピン機能実装計画

## 概要
livedoor Reader風のピン機能を実装する。`p`キーでピンを立て、`o`キーでピンした記事をまとめて開く。

## 実装方針
- articlesテーブルは変更せず、別テーブル（pins）でピン機能を実装
- 既存の`openUrlInBrowser`関数を拡張して複数URL対応
- 各レイヤーでテストを書きながら実装

## 開発プロセス
1. **細かいコミット**: 意味のある最小単位でこまめに`git add` & `git commit`
2. **テスト駆動開発**: 各レイヤーでテストを書いてから実装
3. **品質チェック**: 実装後に`npm run lint`、`npm run test:run`、`npm run typecheck`を実行

## 実装手順

### 1. データベース層
#### schema.sql
```sql
CREATE TABLE IF NOT EXISTS pins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pins_article_id ON pins(article_id);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at DESC);
```

### 2. 型定義（src/types/domain.ts）
```typescript
export type Pin = {
  id: number;
  article_id: number;
  created_at: Date;
};
```

### 3. モデル層（src/models/pin.ts）
- `PinModel`クラスの実装
  - `create(articleId: number): Pin`
  - `delete(articleId: number): boolean`
  - `findByArticleId(articleId: number): Pin | null`
  - `findAll(): Pin[]`
  - `isPinned(articleId: number): boolean`

### 4. モデル層拡張（src/models/article.ts）
- `findAllWithPinStatus(filter: ArticleFilter): Article[]`
  - LEFT JOINでピン状態を含めて取得
- `getPinnedArticles(): Article[]`
  - INNER JOINでピン留め記事のみ取得

### 5. サービス層（src/services/pin.ts）
- `PinService`クラスの実装
  - `togglePin(articleId: number): boolean`
  - `getPinnedArticles(): Article[]`
  - `getPinCount(): number`
  - `clearAllPins(): void` (内部用)

### 6. UI層の更新

#### 6.1 キーバインド（src/apps/tui/hooks/useKeyboardNavigation.ts）
- `p`キー: `onTogglePin`コールバック
- `o`キー: `onOpenInBrowser`コールバック（複数URL対応）

#### 6.2 ピン管理フック（src/apps/tui/hooks/usePinManager.ts）
- ピン状態の管理
- `togglePin(articleId: number)`
- `getPinnedCount(): number`

#### 6.3 App.tsx
- `handleOpenInBrowser`の修正
  - `o`キー: ピン留め記事すべて
  - `v`キー: 現在選択中の記事のみ

#### 6.4 表示更新（src/apps/tui/components/ArticleList.tsx）
- ピン状態の表示（📌アイコン）
- フッターにピン数表示

#### 6.5 ブラウザユーティリティ（src/apps/tui/utils/browser.ts）
- `openUrlInBrowser`を単一/複数URL両対応に拡張

### 7. ヘルプ更新（src/apps/tui/components/HelpOverlay.tsx）
- `p: ピンを立てる/外す`
- `o: ピンした記事をまとめて開く`

## テスト計画
1. `src/models/pin.test.ts`: PinModelの単体テスト
2. `src/models/article.test.ts`: JOIN関連メソッドのテスト追加
3. `src/services/pin.test.ts`: PinServiceの単体テスト
4. `src/apps/tui/utils/browser.test.ts`: 複数URL対応のテスト
5. `src/apps/tui/App.test.tsx`: ピン機能の統合テスト

## 注意事項
- 外部キー制約により、記事削除時にピンも自動削除される
- ピンのクリア機能はサービス層の内部メソッドとして実装（UIからは呼ばない）
- 既存のコードへの影響を最小限に抑える