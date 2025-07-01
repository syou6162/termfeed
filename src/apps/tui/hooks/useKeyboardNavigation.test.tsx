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
          articleCount={5} // 記事が5件ある（インデックス: 0,1,2,3,4）
          selectedArticleIndex={1} // 現在2番目の記事を選択中（インデックス1）
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('j'); // jキーで次の記事へ移動

      // インデックス1から2へ移動（2番目→3番目の記事）
      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(2);
    });

    it('kキーで前の記事に移動する', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5} // 記事が5件ある（インデックス: 0,1,2,3,4）
          selectedArticleIndex={2} // 現在3番目の記事を選択中（インデックス2）
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('k'); // kキーで前の記事へ移動

      // インデックス2から1へ移動（3番目→2番目の記事）
      expect(mockHandlers.onArticleSelectionChange).toHaveBeenCalledWith(1);
    });

    it('最後の記事でjキーを押しても移動しない', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5} // 記事が5件ある（インデックス: 0,1,2,3,4）
          selectedArticleIndex={4} // 現在5番目（最後）の記事を選択中（インデックス4）
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('j'); // jキーを押すが、最後なので移動しない

      // 関数が呼ばれないことを確認（端で止まる動作）
      expect(mockHandlers.onArticleSelectionChange).not.toHaveBeenCalled();
    });

    it('最初の記事でkキーを押しても移動しない', () => {
      const { stdin } = render(
        <TestComponent
          articleCount={5} // 記事が5件ある（インデックス: 0,1,2,3,4）
          selectedArticleIndex={0} // 現在1番目（最初）の記事を選択中（インデックス0）
          onArticleSelectionChange={mockHandlers.onArticleSelectionChange}
        />
      );

      stdin.write('k'); // kキーを押すが、最初なので移動しない

      // 関数が呼ばれないことを確認（端で止まる動作）
      expect(mockHandlers.onArticleSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('フィードナビゲーション', () => {
    it('sキーで次のフィードに移動する', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3} // フィードが3件ある（インデックス: 0,1,2）
          selectedFeedIndex={1} // 現在2番目のフィードを選択中（インデックス1）
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('s'); // sキーで次のフィードへ移動

      // インデックス1から2へ移動（2番目→3番目のフィード）
      expect(mockHandlers.onFeedSelectionChange).toHaveBeenCalledWith(2);
    });

    it('aキーで前のフィードに移動する', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3} // フィードが3件ある（インデックス: 0,1,2）
          selectedFeedIndex={2} // 現在3番目のフィードを選択中（インデックス2）
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('a'); // aキーで前のフィードへ移動

      // インデックス2から1へ移動（3番目→2番目のフィード）
      expect(mockHandlers.onFeedSelectionChange).toHaveBeenCalledWith(1);
    });

    it('最後のフィードでsキーを押しても移動しない', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3} // フィードが3件ある（インデックス: 0,1,2）
          selectedFeedIndex={2} // 現在3番目（最後）のフィードを選択中（インデックス2）
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('s'); // sキーを押すが、最後なので移動しない

      // 関数が呼ばれないことを確認（端で止まる動作）
      expect(mockHandlers.onFeedSelectionChange).not.toHaveBeenCalled();
    });

    it('最初のフィードでaキーを押しても移動しない', () => {
      const { stdin } = render(
        <TestComponent
          feedCount={3} // フィードが3件ある（インデックス: 0,1,2）
          selectedFeedIndex={0} // 現在1番目（最初）のフィードを選択中（インデックス0）
          onFeedSelectionChange={mockHandlers.onFeedSelectionChange}
        />
      );

      stdin.write('a'); // aキーを押すが、最初なので移動しない

      // 関数が呼ばれないことを確認（端で止まる動作）
      expect(mockHandlers.onFeedSelectionChange).not.toHaveBeenCalled();
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
