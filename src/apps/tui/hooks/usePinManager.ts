import { useState, useEffect, useCallback } from 'react';
import { PinService } from '@/services/pin.js';
import type { Article } from '@/types';

type UsePinManagerProps = {
  pinService: PinService;
  currentArticleId?: number;
};

type UsePinManagerReturn = {
  pinnedArticleIds: Set<number>;
  pinnedCount: number;
  isPinned: boolean;
  togglePin: () => void;
  getPinnedArticles: () => Article[];
  refreshPinnedState: () => void;
};

export function usePinManager({
  pinService,
  currentArticleId,
}: UsePinManagerProps): UsePinManagerReturn {
  const [pinnedArticleIds, setPinnedArticleIds] = useState<Set<number>>(new Set());

  // ピン状態を更新する関数
  const refreshPinnedState = useCallback(() => {
    const pinnedArticles = pinService.getPinnedArticles();
    const ids = new Set(pinnedArticles.map((article) => article.id));
    setPinnedArticleIds(ids);
  }, [pinService]);

  // 初回ロード時にピン状態を取得
  useEffect(() => {
    refreshPinnedState();
  }, [refreshPinnedState]);

  // 現在の記事がピンされているかどうか
  const isPinned = currentArticleId ? pinnedArticleIds.has(currentArticleId) : false;

  // ピンの切り替え
  const togglePin = useCallback(() => {
    if (!currentArticleId) return;

    const newPinState = pinService.togglePin(currentArticleId);

    // 状態を更新
    setPinnedArticleIds((prev) => {
      const newSet = new Set(prev);
      if (newPinState) {
        newSet.add(currentArticleId);
      } else {
        newSet.delete(currentArticleId);
      }
      return newSet;
    });
  }, [currentArticleId, pinService]);

  // ピン留めされた記事を取得
  const getPinnedArticles = useCallback(() => {
    return pinService.getPinnedArticles();
  }, [pinService]);

  return {
    pinnedArticleIds,
    pinnedCount: pinnedArticleIds.size,
    isPinned,
    togglePin,
    getPinnedArticles,
    refreshPinnedState,
  };
}
