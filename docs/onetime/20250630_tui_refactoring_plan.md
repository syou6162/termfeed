# Termfeed TUI リファクタリング計画書

## 1. 現状の課題

### 1.1 App.tsx の責務混在（337行）
- **データアクセス層の直接操作**: DatabaseManager、Model層への直接アクセス
- **複雑な状態管理**: 15個のuseStateで管理される状態
- **ビジネスロジックの混在**: フィード更新、既読管理、ブラウザ起動など
- **副作用の管理**: 複数のuseEffectによる非同期処理制御

### 1.2 テスタビリティの問題
- 依存関係が密結合でモックが困難
- UI層とビジネスロジックが分離されていない
- 統合テストしか書けない状態

## 2. リファクタリング戦略

### 2.1 基本方針
- **段階的アプローチ**: 大規模な変更を避け、小さなステップで進める
- **テストファースト**: 可能な限り先にテストを書いてから変更
- **振る舞いの保持**: 既存の機能を壊さないことを最優先

### 2.2 フェーズ分け

#### フェーズ1: 現状の保護（1-2日）
- 現在のApp.tsxの振る舞いを保護する統合テストを作成
- E2Eに近い形でユーザー操作をシミュレート
- 最低限のモックで動作確認

#### フェーズ2: 純粋関数の抽出（1日）
- ブラウザ起動処理などの副作用を持たない処理を抽出
- 抽出した関数のユニットテストを作成

#### フェーズ3: カスタムフックへの段階的移行（3-4日）
- 小さな責務から順次カスタムフックに移行
- 各フックのテストを追加

#### フェーズ4: 状態管理の整理（2-3日）
- UI状態とビジネス状態の分離
- 状態更新ロジックの整理

## 3. 詳細な実装手順

### 3.1 フェーズ1: 統合テストの作成

#### 3.1.1 テストファイルの作成
```
src/apps/tui/__tests__/App.integration.test.tsx
```

#### 3.1.2 必要なモックの準備
```typescript
// 最小限のモックで現状の動作を再現
- FeedService（主要メソッドのみ）
- DatabaseManager（migrateのみ）
- child_process.spawn（ブラウザ起動）
```

#### 3.1.3 テストケース
1. **初期表示**
   - フィード一覧の表示
   - 未読数によるソート
   - 最初のフィードの記事表示

2. **キーボード操作**
   - j/k: 記事移動
   - s/a: フィード移動
   - v: ブラウザで開く
   - f: お気に入りトグル
   - r: 全フィード更新
   - q: 終了

3. **自動既読機能**
   - フィード移動時の既読化
   - アプリ終了時の既読化

4. **エラーハンドリング**
   - フィード読み込みエラー
   - 更新エラー

### 3.2 フェーズ2: 純粋関数の抽出

#### 3.2.1 ブラウザ起動処理
```
src/apps/tui/utils/browser.ts
```

**抽出する関数:**
- `getBrowserCommand(url: string): { command: string; args: string[] }`
- `validateUrl(url: string): boolean`
- `openUrlInBrowser(url: string): void`

**テストファイル:**
```
src/apps/tui/utils/__tests__/browser.test.ts
```

#### 3.2.2 フィードソート処理
```
src/apps/tui/utils/feed-sorter.ts
```

**抽出する関数:**
- `sortFeedsByUnreadCount(feeds: FeedWithUnreadCount[]): FeedWithUnreadCount[]`

### 3.3 フェーズ3: カスタムフックの作成

#### 3.3.1 データ層の分離
```
src/apps/tui/hooks/useTermfeedData.ts
```

**責務:**
- DatabaseManagerの初期化
- Model/Serviceの初期化
- マイグレーション実行

**依存性注入の考慮:**
```typescript
export function useTermfeedData(options?: {
  databasePath?: string;
  migrationEnabled?: boolean;
}) {
  // テスト時はオプションで制御可能に
}
```

#### 3.3.2 フィード管理
```
src/apps/tui/hooks/useFeedManager.ts
```

**管理する状態:**
- feeds: FeedWithUnreadCount[]
- selectedFeedId: number | null
- isLoading: boolean
- error: string
- updateProgress: UpdateProgress | null

**提供する関数:**
- loadFeeds()
- updateAllFeeds()
- selectFeed(id: number)

#### 3.3.3 記事管理
```
src/apps/tui/hooks/useArticleManager.ts
```

**管理する状態:**
- articles: Article[]
- selectedArticleIndex: number
- scrollOffset: number

**提供する関数:**
- loadArticles(feedId: number)
- markAsRead(articleId: number)
- toggleFavorite(articleId: number)
- selectArticle(index: number)

#### 3.3.4 自動既読管理
```
src/apps/tui/hooks/useAutoMarkAsRead.ts
```

**責務:**
- フィード切り替え時の既読処理
- プロセス終了時の既読処理
- エラーハンドリング

### 3.4 フェーズ4: 最終的な構造

#### 3.4.1 リファクタリング後のApp.tsx（約100行を目標）
```typescript
export function App() {
  // データ層の初期化
  const { feedService } = useTermfeedData();
  
  // ビジネスロジック層
  const feedManager = useFeedManager(feedService);
  const articleManager = useArticleManager(feedService, feedManager.selectedFeedId);
  
  // 自動既読機能
  useAutoMarkAsRead(
    articleManager.selectedArticle,
    articleManager.markAsRead
  );
  
  // UI状態のみ
  const [showHelp, setShowHelp] = useState(false);
  
  // キーボードナビゲーション
  useKeyboardNavigation({
    // プロパティは各マネージャーから取得
  });
  
  // レンダリング（変更なし）
}
```

## 4. テスト戦略

### 4.1 テストの種類と目的

1. **統合テスト（App.integration.test.tsx）**
   - 目的: リファクタリング中の安全網
   - カバレッジ目標: 主要なユーザーシナリオ70%

2. **ユニットテスト（各フック/ユーティリティ）**
   - 目的: 個別機能の品質保証
   - カバレッジ目標: 90%以上

3. **E2Eテスト（将来的に検討）**
   - 実際のデータベースを使用した動作確認

### 4.2 モック戦略

#### 依存関係の注入
```typescript
// テスト時はモックを注入可能に
export function useFeedManager(
  feedService: IFeedService,
  options?: { initialFeedId?: number }
) {
  // 実装
}
```

## 5. 作業見積もり

### 5.1 工数見積もり
- フェーズ1: 1-2日（統合テスト作成）
- フェーズ2: 1日（純粋関数の抽出）
- フェーズ3: 3-4日（カスタムフック作成）
- フェーズ4: 2-3日（最終調整とテスト）

**合計: 7-10日**

### 5.2 リスクと対策

#### リスク1: 既存機能の破壊
- **対策**: 統合テストによる保護、段階的な変更

#### リスク2: パフォーマンスの低下
- **対策**: React.memoやuseMemoの適切な使用

#### リスク3: 新しいバグの混入
- **対策**: PRレビュー、段階的なリリース

## 6. 成功指標

1. **コード品質**
   - App.tsxが150行以下
   - 各ファイルが単一責任を持つ
   - 依存関係が明確

2. **テストカバレッジ**
   - TUI全体で70%以上
   - 新規作成ファイルは90%以上

3. **保守性**
   - 新機能追加が容易
   - バグ修正の影響範囲が限定的

## 7. 実装順序の推奨

1. **Day 1-2**: 統合テスト作成
   - 現状の動作を完全に把握
   - 主要シナリオをカバー

2. **Day 3**: 純粋関数の抽出
   - browser.ts作成とテスト
   - feed-sorter.ts作成とテスト

3. **Day 4-5**: データ層フック作成
   - useTermfeedData作成
   - 既存コードからの移行

4. **Day 6-7**: 管理系フック作成
   - useFeedManager作成
   - useArticleManager作成

5. **Day 8-9**: 最終統合
   - App.tsxの整理
   - 全体テストの実行

6. **Day 10**: ドキュメント更新
   - 新しいアーキテクチャの説明
   - 今後の拡張ガイド

## 8. 参考資料

### 8.1 既存コードの場所
- App.tsx: `src/apps/tui/App.tsx`
- 既存フック: `src/apps/tui/hooks/useKeyboardNavigation.ts`
- 型定義: `src/types/`

### 8.2 テストツール
- Vitest: ユニットテスト
- ink-testing-library: TUIコンポーネントテスト
- React Testing Library: フックのテスト

### 8.3 ベストプラクティス
- [React公式: カスタムフックの作成](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Testing Library: フックのテスト](https://react-hooks-testing-library.com/)
- [Kent C. Dodds: テスト戦略](https://kentcdodds.com/blog/write-tests)

## 9. 注意事項

1. **段階的な実装**
   - 一度に大きな変更を加えない
   - 各ステップでテストを実行

2. **既存の振る舞いの保持**
   - ユーザーから見た動作は変更しない
   - パフォーマンスを維持または改善

3. **チームとのコミュニケーション**
   - 大きな変更前にレビューを依頼
   - 進捗を定期的に共有

---

この計画書は生きたドキュメントとして、実装中に適宜更新してください。