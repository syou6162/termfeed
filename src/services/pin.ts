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
   * 最古のピンから指定した数だけ記事を取得する
   * @param limit 取得する記事数の上限
   * @returns ピン留めされた記事の配列（古い順）
   */
  public getOldestPinnedArticles(limit: number): Article[] {
    const pins = this.pinModel.findAll();
    // findAllはDESCなので逆順にして古い順にする
    const oldestPins = pins.reverse().slice(0, limit);

    if (oldestPins.length === 0) {
      return [];
    }

    // 記事を取得（ピンの順序を保持）
    const articles: Article[] = [];
    for (const pin of oldestPins) {
      const article = this.articleModel.findById(pin.article_id);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  }

  /**
   * 指定した記事IDのピンを削除する
   * @param articleIds 削除する記事IDの配列
   */
  public deletePins(articleIds: number[]): void {
    if (articleIds.length === 0) {
      return;
    }
    this.pinModel.deleteMany(articleIds);
  }

  /**
   * 記事にピンを立てる（既に立っている場合は何もしない）
   * @param articleId 記事ID
   */
  public setPin(articleId: number): void {
    const isPinned = this.pinModel.isPinned(articleId);
    if (!isPinned) {
      this.pinModel.create(articleId);
    }
  }

  /**
   * 記事のピンを外す（立っていない場合は何もしない）
   * @param articleId 記事ID
   */
  public unsetPin(articleId: number): void {
    const isPinned = this.pinModel.isPinned(articleId);
    if (isPinned) {
      this.pinModel.delete(articleId);
    }
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
