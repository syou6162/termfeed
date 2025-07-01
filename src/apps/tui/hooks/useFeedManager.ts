import { useState, useCallback } from 'react';
import type { FeedService } from '../../../services/feed-service.js';
import type { UpdateProgress, FeedUpdateFailure } from '../../../types/index.js';
import { sortFeedsByUnreadCount, type FeedWithUnreadCount } from '../utils/feed-sorter.js';
import type { FeedSelection } from '../types/feed.js';

export type FeedManagerState = {
  feeds: FeedWithUnreadCount[];
  selectedFeedIndex: number;
  selectedFeedId: number | null;
  isLoading: boolean;
  error: string;
  updateProgress: UpdateProgress | null;
  abortController: AbortController | null;
  failedFeeds: FeedUpdateFailure[];
  showFailedFeeds: boolean;
};

export type FeedManagerActions = {
  loadFeeds: () => void;
  updateAllFeeds: () => Promise<void>;
  setSelectedFeedIndex: (index: number) => void;
  cancelUpdate: () => void;
  toggleFailedFeeds: () => void;
};

/**
 * フィード管理に関する状態とロジックを管理するカスタムフック
 * - フィード一覧の取得と未読件数の管理
 * - フィードの選択状態管理
 * - フィード更新の進捗とエラーハンドリング
 */
export function useFeedManager(feedService: FeedService): FeedManagerState & FeedManagerActions {
  const [feeds, setFeeds] = useState<FeedWithUnreadCount[]>([]);
  const [selection, setSelection] = useState<FeedSelection>({ index: 0, id: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [failedFeeds, setFailedFeeds] = useState<FeedUpdateFailure[]>([]);
  const [showFailedFeeds, setShowFailedFeeds] = useState(false);

  const loadFeeds = useCallback(() => {
    try {
      setIsLoading(true);
      setError('');

      const allFeeds = feedService.getFeedList();
      const unreadCounts = feedService.getUnreadCountsForAllFeeds();
      const feedsWithUnreadCount = allFeeds.map((feed) => {
        const unreadCount = feed.id ? unreadCounts[feed.id] || 0 : 0;
        return { ...feed, unreadCount };
      });

      // 未読件数でソート
      const sortedFeeds = sortFeedsByUnreadCount(feedsWithUnreadCount);

      setFeeds(sortedFeeds);

      // ソート後に選択中のフィードのインデックスを更新
      if (selection.id) {
        const newIndex = sortedFeeds.findIndex((feed) => feed.id === selection.id);
        if (newIndex !== -1) {
          setSelection({ index: newIndex, id: selection.id });
        }
      } else if (sortedFeeds.length > 0 && sortedFeeds[0].id) {
        // 初回読み込み時は最初のフィードを選択
        setSelection({ index: 0, id: sortedFeeds[0].id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [feedService, selection.id]);

  const updateAllFeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      setUpdateProgress(null);
      setFailedFeeds([]);
      setShowFailedFeeds(false);

      // AbortControllerを作成
      const controller = new AbortController();
      setAbortController(controller);

      const result = await feedService.updateAllFeeds((progress) => {
        setUpdateProgress(progress);
      }, controller.signal);

      // キャンセルされた場合
      if ('cancelled' in result) {
        const cancelledResult = result;
        setError(
          `更新がキャンセルされました (${cancelledResult.processedFeeds}/${cancelledResult.totalFeeds}件処理済み)`
        );
        if (cancelledResult.failed.length > 0) {
          setFailedFeeds(cancelledResult.failed);
        }
      } else {
        // 通常の完了
        if (result.failed.length > 0) {
          setError(
            `フィード更新が一部失敗しました (成功: ${result.summary.successCount}件, 失敗: ${result.summary.failureCount}件)`
          );
          setFailedFeeds(result.failed);
        }
      }

      setUpdateProgress(null);
      loadFeeds();
    } catch (err) {
      // エラー時は進捗情報を保持してエラーメッセージを表示
      setError(err instanceof Error ? err.message : 'フィードの更新に失敗しました');
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [feedService, loadFeeds]);

  const cancelUpdate = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  const toggleFailedFeeds = useCallback(() => {
    setShowFailedFeeds((prev) => !prev);
  }, []);

  const setSelectedFeedIndexWithId = useCallback(
    (index: number) => {
      // 境界チェック: インデックスを安全な範囲に制限
      const safeIndex = Math.max(0, Math.min(index, Math.max(0, feeds.length - 1)));
      const feed = feeds[safeIndex];

      setSelection({
        index: safeIndex,
        id: feed?.id ?? null,
      });
    },
    [feeds]
  );

  return {
    // State
    feeds,
    selectedFeedIndex: selection.index,
    selectedFeedId: selection.id,
    isLoading,
    error,
    updateProgress,
    abortController,
    failedFeeds,
    showFailedFeeds,

    // Actions
    loadFeeds,
    updateAllFeeds,
    setSelectedFeedIndex: setSelectedFeedIndexWithId,
    cancelUpdate,
    toggleFailedFeeds,
  };
}
