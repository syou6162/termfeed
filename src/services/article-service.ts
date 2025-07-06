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
    if (options?.isFavorite !== undefined) {
      if (options.isFavorite) {
        // お気に入り記事のみを取得（データベースレベルでフィルタリング）
        return this.articleModel.getFavoriteArticles({
          feed_id: options.feedId,
          is_read: options.isRead,
          limit: options.limit,
          offset: options.offset,
        });
      } else {
        // お気に入りでない記事のみを取得
        // まず全記事を取得し、お気に入りでない記事をフィルタ
        const allArticles = this.articleModel.findAll({
          feed_id: options?.feedId,
          is_read: options?.isRead,
          limit: options?.limit,
          offset: options?.offset,
        });
        return allArticles.filter((article) => !this.favoriteService.isFavorite(article.id));
      }
    }

    return this.articleModel.findAll({
      feed_id: options?.feedId,
      is_read: options?.isRead,
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
    // 記事の存在確認
    const article = this.articleModel.findById(articleId);
    if (!article) {
      return false;
    }
    return this.favoriteService.toggleFavorite(articleId);
  }

  /**
   * お気に入りトグルと同時にピンも立てる
   * @param articleId 記事ID
   * @returns お気に入りに設定した場合はtrue、外した場合はfalse
   */
  toggleFavoriteWithPin(articleId: number): boolean {
    // 記事の存在確認
    const article = this.articleModel.findById(articleId);
    if (!article) {
      return false;
    }

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
