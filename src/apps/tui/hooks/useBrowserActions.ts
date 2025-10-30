import { useCallback } from 'react';
import { openUrlInBrowser, type OpenUrlResult } from '../utils/browser.js';
import { ERROR_SOURCES } from '../types/error.js';
import type { Article } from '../../../types/domain.js';
import type { PinService } from '../../../services/pin.js';
import type { UseErrorManagerReturn } from '../types/error.js';

interface UseBrowserActionsOptions {
  articles: Article[];
  selectedArticleIndex: number;
  pinService: PinService;
  errorManager: UseErrorManagerReturn;
  showTemporaryMessage: (message: string) => void;
  refreshPinnedState: () => void;
}

/**
 * ブラウザでの記事表示に関するアクションを管理するカスタムフック
 */
export function useBrowserActions({
  articles,
  selectedArticleIndex,
  pinService,
  errorManager,
  showTemporaryMessage,
  refreshPinnedState,
}: UseBrowserActionsOptions) {
  const { addError } = errorManager;

  // vキー: 現在の記事を開く
  const handleOpenInBrowser = useCallback(async () => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.url) {
      try {
        await openUrlInBrowser(selectedArticle.url);
      } catch (error) {
        addError({
          source: ERROR_SOURCES.NETWORK,
          message: error instanceof Error ? error.message : 'ブラウザの起動に失敗しました',
          timestamp: new Date(),
          recoverable: true,
        });
      }
    }
  }, [articles, selectedArticleIndex, addError]);

  // oキー: ピンした記事を10個ずつ開く
  const handleOpenAllPinned = useCallback(async () => {
    const PINS_PER_BATCH = 10;
    const totalPinCount = pinService.getPinCount();

    if (totalPinCount === 0) {
      showTemporaryMessage('📌 ピンした記事がありません');
      return;
    }

    // 古い順に最大10個取得
    const articlesToOpen = pinService.getOldestPinnedArticles(PINS_PER_BATCH);
    const urls = articlesToOpen.map((article) => article.url);
    const articleIds = articlesToOpen.map((article) => article.id);

    try {
      await openUrlInBrowser(urls);
      // すべて成功した場合は開いたピンを削除
      pinService.deletePins(articleIds);
      // ピン状態を更新
      refreshPinnedState();
    } catch (error) {
      // エラーがOpenUrlResultを含むかチェック
      const openUrlError = error as Error & { result?: OpenUrlResult };

      // 成功したURLに対応する記事IDを特定
      if (openUrlError.result?.succeeded?.length && openUrlError.result.succeeded.length > 0) {
        const succeededArticleIds = articlesToOpen
          .filter((article) => openUrlError.result!.succeeded.includes(article.url))
          .map((article) => article.id);

        if (succeededArticleIds.length > 0) {
          pinService.deletePins(succeededArticleIds);
          // ピン状態を更新
          refreshPinnedState();
        }
      }

      // エラーメッセージをより詳細に
      let errorMessage = error instanceof Error ? error.message : 'ブラウザの起動に失敗しました';
      if (openUrlError.result?.failed?.length && openUrlError.result.failed.length > 0) {
        const failedUrls = openUrlError.result.failed.map((f) => f.url).join(', ');
        errorMessage = `一部のURLを開けませんでした (${openUrlError.result.failed.length}件失敗): ${failedUrls}`;
      }

      addError({
        source: ERROR_SOURCES.NETWORK,
        message: errorMessage,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }, [pinService, showTemporaryMessage, refreshPinnedState, addError]);

  return {
    handleOpenInBrowser,
    handleOpenAllPinned,
  };
}
