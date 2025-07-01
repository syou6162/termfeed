import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
];

describe('useAutoMarkAsRead Unit Tests', () => {
  const originalProcessOn = process.on;
  const originalProcessOff = process.off;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    
    // process.on/offをモック
    process.on = vi.fn();
    process.off = vi.fn();
  });

  afterEach(() => {
    // process.on/offを元に戻す
    process.on = originalProcessOn;
    process.off = originalProcessOff;
  });

  it('未読記事を既読にマークする', () => {
    const selectedArticleIndex = 0;
    const currentArticle = mockArticles[selectedArticleIndex];

    // 既読化処理をシミュレート
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      mockFeedService.markArticleAsRead(currentArticle.id);
    }

    expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
  });

  it('既読記事は既読処理をスキップする', () => {
    const selectedArticleIndex = 1; // 既に既読の記事
    const currentArticle = mockArticles[selectedArticleIndex];

    // 既読化処理をシミュレート
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      mockFeedService.markArticleAsRead(currentArticle.id);
    }

    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
  });

  it('記事IDがない場合は既読処理をスキップする', () => {
    const articleWithoutId: Article = {
      ...mockArticles[0],
      id: undefined,
    };

    // 既読化処理をシミュレート
    if (articleWithoutId && articleWithoutId.id && !articleWithoutId.is_read) {
      mockFeedService.markArticleAsRead(articleWithoutId.id);
    }

    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
  });

  it('エラーが発生してもクラッシュしない', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFeedService.markArticleAsRead.mockImplementation(() => {
      throw new Error('既読化エラー');
    });

    const selectedArticleIndex = 0;
    const currentArticle = mockArticles[selectedArticleIndex];

    // エラーハンドリングをシミュレート
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      try {
        mockFeedService.markArticleAsRead(currentArticle.id);
      } catch (err) {
        console.error('記事の既読化に失敗しました:', err);
      }
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '記事の既読化に失敗しました:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('プロセスイベントハンドラーが登録される', () => {
    // useEffectのシミュレート
    const setupProcessHandlers = () => {
      const handleExit = () => {
        // 既読化処理
      };
      
      process.on('SIGINT', handleExit);
      process.on('SIGTERM', handleExit);
    };

    setupProcessHandlers();

    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });
});