import type { DatabaseManager } from '../models/database.js';
import { FavoriteModel } from '../models/favorite.js';
import { ArticleModel } from '../models/article.js';
import type { Favorite, Article } from '../types/index.js';

export class FavoriteService {
  private favoriteModel: FavoriteModel;
  private articleModel: ArticleModel;

  constructor(db: DatabaseManager) {
    this.favoriteModel = new FavoriteModel(db);
    this.articleModel = new ArticleModel(db);
  }

  /**
   * 記事をお気に入りに追加
   */
  addFavorite(articleId: number): Favorite {
    return this.favoriteModel.create(articleId);
  }

  /**
   * 記事をお気に入りから削除
   */
  removeFavorite(articleId: number): boolean {
    return this.favoriteModel.delete(articleId);
  }

  /**
   * 記事がお気に入りかどうかを確認
   */
  isFavorite(articleId: number): boolean {
    return this.favoriteModel.isFavorite(articleId);
  }

  /**
   * お気に入りの切り替え
   * @returns お気に入りに追加した場合はtrue、削除した場合はfalse
   */
  toggleFavorite(articleId: number): boolean {
    if (this.isFavorite(articleId)) {
      this.removeFavorite(articleId);
      return false;
    } else {
      this.addFavorite(articleId);
      return true;
    }
  }

  /**
   * お気に入り記事のIDリストを取得
   */
  getFavoriteArticleIds(): number[] {
    return this.favoriteModel.getFavoriteArticleIds();
  }

  /**
   * お気に入り数を取得
   */
  getFavoriteCount(): number {
    return this.favoriteModel.getFavoriteCount();
  }

  /**
   * すべてのお気に入りをクリア
   */
  clearAllFavorites(): number {
    return this.favoriteModel.clearAllFavorites();
  }

  /**
   * お気に入り記事を取得
   * @returns お気に入り記事の配列（作成日時の降順）
   */
  getFavoriteArticles(): Article[] {
    return this.articleModel.getFavoriteArticles();
  }
}
