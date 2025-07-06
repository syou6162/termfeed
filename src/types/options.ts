// オプション型の定義

export type ArticleFilter = 'all' | 'favorites';

export type ArticleQueryOptions = {
  feedId?: number;
  isRead?: boolean;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'published_at' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
};

export type CrawlerOptions = {
  timeout?: number;
  userAgent?: string;
};

export type ServiceError = {
  code: string;
  message: string;
  originalError?: Error;
};

// 更新結果の判別共用体型
export type FeedUpdateSuccess = {
  status: 'success';
  feedId: number;
  result: import('./dto').FeedUpdateResult;
};

export type FeedUpdateFailure = {
  status: 'failure';
  feedId: number;
  feedUrl: string;
  error: Error;
};

export type FeedUpdateOutcome = FeedUpdateSuccess | FeedUpdateFailure;

// 更新進捗情報
export type UpdateProgress = {
  totalFeeds: number;
  currentIndex: number;
  currentFeedTitle: string;
  currentFeedUrl: string;
};

// 進捗通知用のコールバック
export type UpdateProgressCallback = (progress: UpdateProgress) => void;

// 更新キャンセル結果
export type UpdateCancelledResult = {
  cancelled: true;
  processedFeeds: number;
  totalFeeds: number;
  successful: FeedUpdateSuccess[];
  failed: FeedUpdateFailure[];
};
