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
export interface ErrorInfo {
  source: ErrorSource;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * 複数のエラーを管理するためのフック用の型
 */
export interface UseErrorManagerReturn {
  errors: ErrorInfo[];
  addError: (error: ErrorInfo) => void;
  clearErrors: () => void;
  clearErrorsBySource: (source: ErrorInfo['source']) => void;
  hasError: boolean;
  getLatestError: () => ErrorInfo | null;
}
