/**
 * TUIアプリケーションの設定定数
 */
export const TUI_CONFIG = {
  /** 記事取得時のデフォルト制限数 */
  DEFAULT_ARTICLE_LIMIT: 100,
  
  /** スクロール時のページサイズ（行数） */
  SCROLL_PAGE_SIZE: 10,
  
  /** 記事表示時の固定要素の行数 */
  ARTICLE_FIXED_LINES: 16,
  
  /** デフォルトのターミナル高さ（stdout.rowsが取得できない場合） */
  DEFAULT_TERMINAL_HEIGHT: 24,
  
  /** フィード更新時のタイムアウト（ミリ秒） */
  FEED_UPDATE_TIMEOUT: 30000,
  
  /** エラー表示の自動消去時間（ミリ秒） */
  ERROR_AUTO_CLEAR_TIMEOUT: 2000,
} as const;