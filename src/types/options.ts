// オプション型の定義

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

// TUIアプリケーション固有の型

/**
 * エラーソースの定義（拡張可能）
 */
export const ERROR_SOURCES = {
  FEED: 'feed',
  ARTICLE: 'article',
  NETWORK: 'network',
  DATABASE: 'database',
} as const;

export type ErrorSource = (typeof ERROR_SOURCES)[keyof typeof ERROR_SOURCES];

/**
 * TUIアプリケーションのエラー情報
 */
export type ErrorInfo = {
  source: ErrorSource;
  message: string;
  timestamp: Date;
  recoverable: boolean;
};

/**
 * 複数のエラーを管理するためのフック用の型
 */
export type UseErrorManagerReturn = {
  errors: ErrorInfo[];
  addError: (error: ErrorInfo) => void;
  clearErrors: () => void;
  clearErrorsBySource: (source: ErrorInfo['source']) => void;
  hasError: boolean;
  getLatestError: () => ErrorInfo | null;
};

/**
 * フィード選択状態を表す型
 */
export type FeedSelection = {
  index: number;
  id: number | null;
};

/**
 * 記事選択状態を表す型
 */
export type ArticleSelection = {
  index: number;
  articleId: number | null;
};
