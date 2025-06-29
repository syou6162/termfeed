import { ArticleModel } from '../models/article.js';
import type { Article, ArticleService as IArticleService } from '@/types';

export class ArticleService implements IArticleService {
  private articleModel: ArticleModel;

  constructor(articleModel: ArticleModel) {
    this.articleModel = articleModel;
  }

  getArticles(options?: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Article[] {
    return this.articleModel.findAll({
      feed_id: options?.feedId,
      is_read: options?.isRead,
      is_favorite: options?.isFavorite,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  getArticleById(articleId: number): Article | null {
    return this.articleModel.findById(articleId);
  }

  markAsRead(articleId: number): boolean {
    return this.articleModel.markAsRead(articleId);
  }

  markAsUnread(articleId: number): boolean {
    return this.articleModel.markAsUnread(articleId);
  }

  toggleFavorite(articleId: number): boolean {
    return this.articleModel.toggleFavorite(articleId);
  }

  getUnreadCount(feedId?: number): number {
    return this.articleModel.countUnread(feedId);
  }

  getTotalCount(feedId?: number): number {
    return this.articleModel.count(feedId);
  }
}
