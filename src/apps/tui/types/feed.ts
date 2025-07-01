/**
 * フィード選択状態を表す型
 */
export interface FeedSelection {
  index: number;
  id: number | null;
}

/**
 * 記事選択状態を表す型
 */
export interface ArticleSelection {
  index: number;
  articleId: number | null;
}
