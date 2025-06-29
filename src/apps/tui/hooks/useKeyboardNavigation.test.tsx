import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useKeyboardNavigation } from './useKeyboardNavigation.js';

function TestComponent({
  articleCount = 5,
  feedCount = 3,
  selectedArticleIndex = 0,
  selectedFeedIndex = 0,
  onArticleSelectionChange = vi.fn(),
  onFeedSelectionChange = vi.fn(),
  onOpenInBrowser = vi.fn(),
  onRefreshAll = vi.fn(),
  onToggleFavorite = vi.fn(),
  onToggleHelp = vi.fn(),
  onQuit = vi.fn(),
}) {
  useKeyboardNavigation({
    articleCount,
    feedCount,
    selectedArticleIndex,
    selectedFeedIndex,
    onArticleSelectionChange,
    onFeedSelectionChange,
    onOpenInBrowser,
    onRefreshAll,
    onToggleFavorite,
    onToggleHelp,
    onQuit,
  });

  return <Text>Test Component</Text>;
}

describe('useKeyboardNavigation', () => {
  let mockHandlers: {
    onArticleSelectionChange: ReturnType<typeof vi.fn>;
    onFeedSelectionChange: ReturnType<typeof vi.fn>;
    onOpenInBrowser: ReturnType<typeof vi.fn>;
    onRefreshAll: ReturnType<typeof vi.fn>;
    onToggleFavorite: ReturnType<typeof vi.fn>;
    onToggleHelp: ReturnType<typeof vi.fn>;
    onQuit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockHandlers = {
      onArticleSelectionChange: vi.fn(),
      onFeedSelectionChange: vi.fn(),
      onOpenInBrowser: vi.fn(),
      onRefreshAll: vi.fn(),
      onToggleFavorite: vi.fn(),
      onToggleHelp: vi.fn(),
      onQuit: vi.fn(),
    };
  });

  describe('記事ナビゲーション', () => {
    it('jキーで次の記事に移動する', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5}
          selectedArticleIndex={1}
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('j');

      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(2);
    });

    it('kキーで前の記事に移動する', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5}
          selectedArticleIndex={2}
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('k');

      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(1);
    });

    it('最後の記事でjキーを押すと最初の記事に戻る', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5}
          selectedArticleIndex={4}
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('j');

      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(0);
    });

    it('最初の記事でkキーを押すと最後の記事に移動する', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5}
          selectedArticleIndex={0}
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('k');

      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(4);
    });
  });

  describe('フィードナビゲーション', () => {
    it('sキーで次のフィードに移動する', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3}
          selectedFeedIndex={1}
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('s');

      expect(mockHandlers.onFeedSelectionChange).toHaveBeenCalledWith(2);
    });

    it('aキーで前のフィードに移動する', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3}
          selectedFeedIndex={2}
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('a');

      expect(mockHandlers.onFeedSelectionChange).toHaveBeenCalledWith(1);
    });

    it('最後のフィードでsキーを押すと最初のフィードに戻る', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3}
          selectedFeedIndex={2}
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('s');

      expect(mockHandlers.onFeedSelectionChange).toHaveBeenCalledWith(0);
    });
  });

  describe('その他のキー操作', () => {
    it('vキーでブラウザを開く', () => {
      const { stdin } = render(<TestComponent onOpenInBrowser={mockHandlers.onOpenInBrowser} />);

      stdin.write('v');

      expect(mockHandlers.onOpenInBrowser).toHaveBeenCalledOnce();
    });

    it('?キーでヘルプを表示', () => {
      const { stdin } = render(<TestComponent onToggleHelp={mockHandlers.onToggleHelp} />);

      stdin.write('?');

      expect(mockHandlers.onToggleHelp).toHaveBeenCalledOnce();
    });

    it('fキーでお気に入り状態をトグルする', () => {
      const { stdin } = render(<TestComponent onToggleFavorite={mockHandlers.onToggleFavorite} />);

      stdin.write('f');

      expect(mockHandlers.onToggleFavorite).toHaveBeenCalledOnce();
    });

    it('rキーで全フィードを更新する', () => {
      const { stdin } = render(<TestComponent onRefreshAll={mockHandlers.onRefreshAll} />);

      stdin.write('r');

      expect(mockHandlers.onRefreshAll).toHaveBeenCalledOnce();
    });

    it('qキーでアプリを終了する', () => {
      const { stdin } = render(<TestComponent onQuit={mockHandlers.onQuit} />);

      stdin.write('q');

      expect(mockHandlers.onQuit).toHaveBeenCalledOnce();
    });
  });

  describe('エッジケース', () => {
    it('記事がない時はjキーを押しても何も起こらない', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={0}
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('j');

      expect(mockHandlers.onArticleSelectionChange).not.toHaveBeenCalled();
    });

    it('フィードがない時はsキーを押しても何も起こらない', () => {
      const { stdin } = render(
        <TestComponent feedCount={0} onFeedSelectionChange={mockHandlers.onFeedSelectionChange} />
      );

      stdin.write('s');

      expect(mockHandlers.onFeedSelectionChange).not.toHaveBeenCalled();
    });
  });
});
