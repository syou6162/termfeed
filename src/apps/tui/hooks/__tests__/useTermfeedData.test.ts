import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { useTermfeedData } from '../useTermfeedData.js';

// モックの設定
const mockDatabaseManager = {
  migrate: vi.fn(),
};

const mockFeedModel = {};
const mockArticleModel = {
  getPinnedArticles: vi.fn(() => []),
};
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  updateAllFeeds: vi.fn(),
};

vi.mock('@/models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => mockDatabaseManager),
}));

vi.mock('@/models/feed.js', () => ({
  FeedModel: vi.fn().mockImplementation(() => mockFeedModel),
}));

vi.mock('@/models/article.js', () => ({
  ArticleModel: vi.fn().mockImplementation(() => mockArticleModel),
}));

vi.mock('@/services/feed-service.js', () => ({
  FeedService: vi.fn().mockImplementation(() => mockFeedService),
}));

vi.mock('@/apps/cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => mockDatabaseManager),
}));

// グローバルに結果を保持する型定義
interface TestGlobal {
  __testFeedService?: ReturnType<typeof useTermfeedData>['feedService'];
}

// テスト用コンポーネント
function TestComponent() {
  const { feedService } = useTermfeedData();
  (globalThis as TestGlobal).__testFeedService = feedService;
  return React.createElement('text', null, 'test');
}

describe('useTermfeedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as TestGlobal).__testFeedService;
  });

  it('DatabaseManagerを作成し、マイグレーションを実行する', () => {
    render(React.createElement(TestComponent));

    expect(mockDatabaseManager.migrate).toHaveBeenCalled();
    expect((globalThis as TestGlobal).__testFeedService).toBeDefined();
  });

  it('FeedServiceインスタンスを返す', () => {
    render(React.createElement(TestComponent));

    expect((globalThis as TestGlobal).__testFeedService).toBe(mockFeedService);
  });

  it('各Modelが正しく初期化される', async () => {
    const { FeedModel } = await import('@/models/feed.js');
    const { ArticleModel } = await import('@/models/article.js');
    const { FeedService } = await import('@/services/feed-service.js');

    render(React.createElement(TestComponent));

    expect(FeedModel).toHaveBeenCalledWith(mockDatabaseManager);
    expect(ArticleModel).toHaveBeenCalledWith(mockDatabaseManager);
    expect(FeedService).toHaveBeenCalledWith(mockFeedModel, mockArticleModel);
  });
});
