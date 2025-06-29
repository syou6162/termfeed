import type { Article } from '@/types';

export interface ArticleService {
  /**
   * 記事一覧を取得（フィルタリング・ページネーション対応）
   */
  getArticles(options: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Article[]>;

  /**
   * 記事を既読にマーク
   */
  markAsRead(articleId: number): Promise<boolean>;

  /**
   * 記事を未読にマーク
   */
  markAsUnread(articleId: number): Promise<boolean>;

  /**
   * お気に入り状態をトグル
   */
  toggleFavorite(articleId: number): Promise<boolean>;

  /**
   * 未読記事数を取得
   */
  getUnreadCount(feedId?: number): Promise<number>;

  /**
   * 記事の総数を取得
   */
  getTotalCount(feedId?: number): Promise<number>;
}
