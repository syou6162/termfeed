/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { FavoriteList } from '../FavoriteList.js';
import type { Article } from '../../../../types/index.js';

// useKeyboardNavigationフックをモック化
vi.mock('../../hooks/useKeyboardNavigation.js', () => ({
  useKeyboardNavigation: vi.fn(),
}));

// FavoriteServiceのモック
const mockFavoriteService = {
  getFavoriteArticles: vi.fn(),
} as any;

// テスト用のモック記事データ
const mockFavoriteArticles: Article[] = [
  {
    id: 1,
    feed_id: 1,
    title: 'お気に入り記事1',
    url: 'https://example.com/article1',
    content: 'これはお気に入り記事1の内容です。',
    published_at: new Date('2023-01-01'),
    is_read: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 2,
    feed_id: 1,
    title: 'お気に入り記事2',
    url: 'https://example.com/article2',
    content: 'これはお気に入り記事2の内容です。',
    published_at: new Date('2023-01-02'),
    is_read: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

describe('FavoriteList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFavoriteService.getFavoriteArticles.mockReturnValue(mockFavoriteArticles);
  });

  it('お気に入り記事がない場合は適切なメッセージを表示する', () => {
    mockFavoriteService.getFavoriteArticles.mockReturnValue([]);

    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    expect(lastFrame()).toContain('お気に入りの記事がありません');
  });

  it('お気に入り記事一覧を表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('お気に入り記事一覧');
    });

    const output = lastFrame();
    expect(output).toContain('お気に入り記事一覧 (2件)');
    expect(output).toContain('お気に入り記事1');
    expect(output).toContain('公開日: 2023/1/1');
    expect(output).toContain('URL: https://example.com/article1');
  });

  it('選択中の記事を適切に表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('お気に入り記事一覧');
    });

    const output = lastFrame();
    expect(output).toContain('お気に入り記事1');
    expect(output).toContain('URL: https://example.com/article1');
  });

  it('ピンされた記事にピンアイコンを表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={(articleId) => articleId === 1}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('お気に入り記事一覧');
    });

    const output = lastFrame();
    expect(output).toContain('📌');
    expect(output).toContain('ピン');
  });

  it('キーボードショートカットのヘルプを表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('お気に入り記事一覧');
    });

    const output = lastFrame();
    expect(output).toContain('お気に入り記事一覧 (2件)');
    expect(output).toContain('1/2');
  });

  it('記事が選択されていない場合は適切なメッセージを表示する', () => {
    mockFavoriteService.getFavoriteArticles.mockReturnValue([]);

    const { lastFrame } = render(
      <FavoriteList
        favoriteService={mockFavoriteService}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('お気に入りの記事がありません');
  });
});
