import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { useFeedManager } from '../useFeedManager.js';
import type { Feed, FeedUpdateFailure } from '@/types';

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
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    description: 'Test feed 1 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    description: 'Test feed 2 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
];

const mockUnreadCounts = {
  1: 5,
  2: 3,
};

// グローバルに結果を保持する型定義
interface TestGlobal {
  __testFeedManager?: ReturnType<typeof useFeedManager>;
}

// テスト用コンポーネント
function TestComponent({ feedService }: { feedService: typeof mockFeedService }) {
  const manager = useFeedManager(feedService);
  (globalThis as TestGlobal).__testFeedManager = manager;
  return React.createElement('text', null, 'test');
}

describe('useFeedManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as TestGlobal).__testFeedManager;

    // デフォルトのモック実装
    mockFeedService.getFeedList.mockReturnValue(mockFeeds);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue(mockUnreadCounts);
    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 2, failureCount: 0 },
      failed: [],
    });
  });

  it('初期状態が正しく設定される', () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    expect(manager.feeds).toEqual([]);
    expect(manager.selectedFeedIndex).toBe(0);
    expect(manager.selectedFeedId).toBeNull();
    expect(manager.isLoading).toBe(false);
    expect(manager.error).toBe('');
    expect(manager.updateProgress).toBeNull();
    expect(manager.abortController).toBeNull();
    expect(manager.failedFeeds).toEqual([]);
    expect(manager.showFailedFeeds).toBe(false);
  });

  it('loadFeedsがフィード一覧を取得し、未読件数でソートする', () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    manager.loadFeeds();

    expect(mockFeedService.getFeedList).toHaveBeenCalled();
    expect(mockFeedService.getUnreadCountsForAllFeeds).toHaveBeenCalled();

    // 未読件数でソートされていることを確認（Feed 1の方が未読数が多い）
    expect(manager.feeds.length).toBe(2);
    expect(manager.feeds[0].id).toBe(1);
    expect(manager.feeds[0].unreadCount).toBe(5);
    expect(manager.feeds[1].id).toBe(2);
    expect(manager.feeds[1].unreadCount).toBe(3);
  });

  it('初回読み込み時に最初のフィードが選択される', () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    manager.loadFeeds();

    expect(manager.selectedFeedId).toBe(1);
  });

  it('エラーが発生した場合、エラーメッセージが設定される', () => {
    mockFeedService.getFeedList.mockImplementation(() => {
      throw new Error('ネットワークエラー');
    });

    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    manager.loadFeeds();

    expect(manager.error).toBe('ネットワークエラー');
    expect(manager.isLoading).toBe(false);
  });

  it('updateAllFeedsが全フィードを更新する', async () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    manager.loadFeeds(); // 初期データを読み込み
    await manager.updateAllFeeds();

    expect(mockFeedService.updateAllFeeds).toHaveBeenCalled();
    expect(manager.error).toBe('');
    expect(manager.isLoading).toBe(false);
  });

  it('更新がキャンセルされた場合、適切なメッセージが表示される', async () => {
    mockFeedService.updateAllFeeds.mockResolvedValue({
      cancelled: true,
      processedFeeds: 1,
      totalFeeds: 2,
      failed: [],
    });

    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    await manager.updateAllFeeds();

    expect(manager.error).toBe('更新がキャンセルされました (1/2件処理済み)');
  });

  it('更新に失敗したフィードがある場合、エラー詳細が保持される', async () => {
    const failedFeeds: FeedUpdateFailure[] = [
      {
        status: 'failure',
        feedId: 1,
        feedUrl: 'https://example.com/feed1.rss',
        error: new Error('タイムアウト'),
      },
    ];

    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 1, failureCount: 1 },
      failed: failedFeeds,
    });

    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    await manager.updateAllFeeds();

    expect(manager.error).toBe('フィード更新が一部失敗しました (成功: 1件, 失敗: 1件)');
    expect(manager.failedFeeds).toEqual(failedFeeds);
  });

  it('handleCancelUpdateがAbortControllerを呼び出す', async () => {
    const mockAbort = vi.fn();
    const mockController = { abort: mockAbort, signal: {} as AbortSignal };

    mockFeedService.updateAllFeeds.mockImplementation((callback, signal) => {
      // AbortControllerが設定されるまで待つ
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            cancelled: true,
            processedFeeds: 0,
            totalFeeds: 2,
            failed: [],
          });
        }, 10);
      });
    });

    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;

    // updateAllFeedsを開始（完了を待たない）
    const updatePromise = manager.updateAllFeeds();

    // AbortControllerが設定されるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // モックのAbortControllerを設定
    if (manager.abortController) {
      manager.abortController.abort = mockAbort;
    }

    manager.handleCancelUpdate();

    await updatePromise;

    expect(mockAbort).toHaveBeenCalled();
  });

  it('handleToggleFailedFeedsがshowFailedFeedsをトグルする', () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;

    expect(manager.showFailedFeeds).toBe(false);
    manager.handleToggleFailedFeeds();
    expect(manager.showFailedFeeds).toBe(true);
    manager.handleToggleFailedFeeds();
    expect(manager.showFailedFeeds).toBe(false);
  });

  it('setSelectedFeedIndexがフィードのインデックスとIDを更新する', () => {
    render(React.createElement(TestComponent, { feedService: mockFeedService }));

    const manager = (globalThis as TestGlobal).__testFeedManager!;
    manager.loadFeeds(); // フィードデータを読み込み

    manager.setSelectedFeedIndex(1);
    expect(manager.selectedFeedIndex).toBe(1);
    expect(manager.selectedFeedId).toBe(2); // 2番目のフィードのID
  });
});