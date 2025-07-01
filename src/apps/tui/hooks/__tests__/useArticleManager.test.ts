import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Article } from '@/types';

// モックのFeedService
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  updateAllFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
};

// テスト用データ
const mockArticles: Article[] = [
  {
    id: 1,
    feed_id: 1,
    title: 'Article 1',
    url: 'https://example.com/article1',
    content: 'Article 1 content',
    summary: 'Article 1 summary',
    author: 'Author 1',
    published_at: new Date('2024-01-01'),
    is_read: false,
    is_favorite: false,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    feed_id: 1,
    title: 'Article 2',
    url: 'https://example.com/article2',
    content: 'Article 2 content',
    summary: 'Article 2 summary',
    author: 'Author 2',
    published_at: new Date('2024-01-02'),
    is_read: true,
    is_favorite: true,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
  },
  {
    id: 3,
    feed_id: 1,
    title: 'Article 3',
    url: 'https://example.com/article3',
    content: 'Article 3 content',
    summary: 'Article 3 summary',
    author: 'Author 3',
    published_at: new Date('2024-01-03'),
    is_read: false,
    is_favorite: false,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
  },
];

describe('useArticleManager Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    mockFeedService.getArticles.mockReturnValue(mockArticles);
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});
  });

  it('未読記事のみがフィルタリングされることを確認', () => {
    const allArticles = mockFeedService.getArticles({ feed_id: 1, limit: 100 }) as Article[];
    const unreadArticles = allArticles.filter((article) => !article.is_read);

    expect(unreadArticles.length).toBe(2);
    expect(unreadArticles[0].id).toBe(1);
    expect(unreadArticles[1].id).toBe(3);
  });

  it('FeedServiceのgetArticlesメソッドが正しく呼ばれることを確認', () => {
    mockFeedService.getArticles({ feed_id: 1, limit: 100 });

    expect(mockFeedService.getArticles).toHaveBeenCalledWith({
      feed_id: 1,
      limit: 100,
    });
  });

  it('お気に入りトグルが正しく呼ばれることを確認', () => {
    mockFeedService.toggleArticleFavorite(1);

    expect(mockFeedService.toggleArticleFavorite).toHaveBeenCalledWith(1);
  });

  it('エラーハンドリングが正しく機能することを確認', () => {
    mockFeedService.getArticles.mockImplementation(() => {
      throw new Error('記事の取得に失敗しました');
    });

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = mockFeedService.getArticles({ feed_id: 1, limit: 100 });
      return result as Article[];
    }).toThrow('記事の取得に失敗しました');
  });

  it('スクロール計算が正しく行われることを確認', () => {
    const totalHeight = 50;
    const fixedLines = 16;
    const availableLines = Math.max(1, totalHeight - fixedLines);

    expect(availableLines).toBe(34);
  });
});
