# 型定義ディレクトリガイド

このディレクトリには、termfeedプロジェクトのすべての型定義が集約されています。

## 📁 ファイル構成

| ファイル      | 役割                           | 例                                        |
| ------------- | ------------------------------ | ----------------------------------------- |
| `domain.ts`   | DBエンティティ・ドメインモデル | `Feed`, `Article`, `CreateFeedInput`      |
| `dto.ts`      | データ転送・外部システム連携   | `RSSItem`, `CrawlResult`, `AddFeedResult` |
| `options.ts`  | 関数引数・設定・フィルタ条件   | `ArticleQueryOptions`, `ServiceError`     |
| `services.ts` | サービス層のインターフェース   | `FeedService`, `ArticleService`           |
| `index.ts`    | すべての型の再エクスポート     | -                                         |

## 🚀 クイックリファレンス

### 新しい型を追加する場合

1. **DBに保存されるエンティティ** → `domain.ts`

   ```typescript
   export type User = {
     id: number;
     name: string;
     created_at: Date;
   };
   ```

2. **APIレスポンスや外部データ** → `dto.ts`

   ```typescript
   export type ApiResponse = {
     success: boolean;
     data: unknown;
   };
   ```

3. **関数の引数やオプション** → `options.ts`

   ```typescript
   export type SearchOptions = {
     query: string;
     limit?: number;
   };
   ```

4. **サービスのインターフェース** → `services.ts`
   ```typescript
   export type UserService = {
     getUser(id: number): User | null;
   };
   ```

### 型のインポート方法

```typescript
// 推奨: パスエイリアスを使用
import type { Feed, Article } from '@/types';

// 非推奨: 相対パス
import type { Feed } from '../types/domain';
```

## 📖 詳細ドキュメント

型定義の設計思想、詳細な使い分け基準、アンチパターンについては以下を参照：

→ [../../docs/development/type_definitions.md](../../docs/development/type_definitions.md)
