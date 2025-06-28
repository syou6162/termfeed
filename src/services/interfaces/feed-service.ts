import { Feed, CreateFeedInput } from '../../models/types';

export interface FeedService {
  /**
   * 新しいRSSフィードを追加
   */
  addFeed(input: CreateFeedInput): Promise<Feed>;

  /**
   * 全フィードを取得
   */
  getAllFeeds(): Promise<Feed[]>;

  /**
   * フィードIDで削除
   */
  removeFeed(feedId: number): Promise<boolean>;

  /**
   * RSSフィードを更新して新しい記事を取得
   */
  updateFeed(feedId: number): Promise<void>;

  /**
   * 全フィードを更新
   */
  updateAllFeeds(): Promise<void>;

  /**
   * URLからフィードのメタデータを取得（追加前の検証用）
   */
  validateFeedUrl(url: string): Promise<{ title: string; description?: string }>;
}
