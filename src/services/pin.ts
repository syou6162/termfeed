import { DatabaseManager } from '../models/database.js';
import { PinModel } from '../models/pin.js';
import { ArticleModel } from '../models/article.js';
import type { Article } from '../types/index.js';

export class PinService {
  private pinModel: PinModel;
  private articleModel: ArticleModel;

  constructor(db: DatabaseManager) {
    this.pinModel = new PinModel(db);
    this.articleModel = new ArticleModel(db);
  }

  /**
   * 記事のピン状態を切り替える
   * @param articleId 記事ID
   * @returns ピンを立てた場合はtrue、外した場合はfalse
   */
  public togglePin(articleId: number): boolean {
    const isPinned = this.pinModel.isPinned(articleId);

    if (isPinned) {
      this.pinModel.delete(articleId);
      return false;
    } else {
      this.pinModel.create(articleId);
      return true;
    }
  }

  /**
   * ピン留めされた記事を取得する
   * @returns ピン留めされた記事の配列（ピンの作成日時の降順）
   */
  public getPinnedArticles(): Article[] {
    return this.articleModel.getPinnedArticles();
  }

  /**
   * ピン数を取得する
   * @returns ピン数
   */
  public getPinCount(): number {
    return this.pinModel.findAll().length;
  }

  /**
   * すべてのピンをクリアする（内部用）
   * @internal
   */
  public clearAllPins(): void {
    const pins = this.pinModel.findAll();
    for (const pin of pins) {
      this.pinModel.delete(pin.article_id);
    }
  }
}
