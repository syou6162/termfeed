import { ArticleModel } from '../models/article.js';
import { PinService } from './pin.js';
import { FavoriteService } from './favorite.js';
import type { Article, ArticleService as IArticleService } from '@/types';

export class ArticleService implements IArticleService {
  private articleModel: ArticleModel;
  private pinService: PinService;
  private favoriteService: FavoriteService;

  constructor(
    articleModel: ArticleModel,
    pinService: PinService,
    favoriteService: FavoriteService
  ) {
    this.articleModel = articleModel;
    this.pinService = pinService;
    this.favoriteService = favoriteService;
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
    return this.favoriteService.toggleFavorite(articleId);
  }

  /**
   * お気に入りトグルと同時にピンも立てる
   * @param articleId 記事ID
   * @returns お気に入りに設定した場合はtrue、外した場合はfalse
   */
  toggleFavoriteWithPin(articleId: number): boolean {
    const isFavorite = this.favoriteService.toggleFavorite(articleId);

    if (isFavorite) {
      // お気に入りに設定した場合：ピンを立てる
      this.pinService.setPin(articleId);
    } else {
      // お気に入りを外した場合：ピンも外す
      this.pinService.unsetPin(articleId);
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
