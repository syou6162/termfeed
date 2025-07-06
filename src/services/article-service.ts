import { ArticleModel } from '../models/article.js';
import { PinService } from './pin.js';
import type { Article, ArticleService as IArticleService } from '@/types';

export class ArticleService implements IArticleService {
  private articleModel: ArticleModel;
  private pinService?: PinService;

  constructor(articleModel: ArticleModel, pinService?: PinService) {
    this.articleModel = articleModel;
    this.pinService = pinService;
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

  /**
   * お気に入りトグルと同時にピンも立てる
   * @param articleId 記事ID
   * @returns お気に入りに設定した場合はtrue、外した場合はfalse
   */
  toggleFavoriteWithPin(articleId: number): boolean {
    const isFavorite = this.articleModel.toggleFavorite(articleId);

    // お気に入りに設定した場合のみピンを立てる
    if (isFavorite && this.pinService) {
      const isPinned = this.pinService.togglePin(articleId);
      // 既にピンが立っている場合は元に戻す（ピンを立てたままにする）
      if (!isPinned) {
        this.pinService.togglePin(articleId);
      }
    }

    return isFavorite;
  }

  getUnreadCount(feedId?: number): number {
    return this.articleModel.countUnread(feedId);
  }

  getTotalCount(feedId?: number): number {
    return this.articleModel.count(feedId);
  }
}
