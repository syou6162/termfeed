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
