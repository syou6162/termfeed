/**
 * TUIアプリケーションのエラー情報
 */
export interface ErrorInfo {
  source: 'feed' | 'article' | 'network' | 'database';
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