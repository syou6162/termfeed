/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { FavoriteList } from '../FavoriteList.js';
import type { Article } from '../../../../types/index.js';

// useKeyboardNavigationフックをモック化
vi.mock('../../hooks/useKeyboardNavigation.js', () => ({
  useKeyboardNavigation: vi.fn(),
}));

// ArticleModelのモック
const mockArticleModel = {
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
    mockArticleModel.getFavoriteArticles.mockReturnValue(mockFavoriteArticles);
  });

  it('お気に入り記事がない場合は適切なメッセージを表示する', () => {
    mockArticleModel.getFavoriteArticles.mockReturnValue([]);

    const { lastFrame } = render(
      <FavoriteList
        articleModel={mockArticleModel}
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
        articleModel={mockArticleModel}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 10));

    const output = lastFrame();
    expect(output).toContain('お気に入り記事一覧 (2件)');
    expect(output).toContain('お気に入り記事1');
    expect(output).toContain('お気に入り記事2');
  });

  it('選択中の記事を適切に表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        articleModel={mockArticleModel}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 10));

    const output = lastFrame();
    expect(output).toContain('お気に入り記事1');
    expect(output).toContain('これはお気に入り記事1の内容です。');
  });

  it('ピンされた記事にピンアイコンを表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        articleModel={mockArticleModel}
        isPinned={(articleId) => articleId === 1}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 10));

    const output = lastFrame();
    expect(output).toContain('📌');
  });

  it('キーボードショートカットのヘルプを表示する', async () => {
    const { lastFrame } = render(
      <FavoriteList
        articleModel={mockArticleModel}
        isPinned={() => false}
        onOpenInBrowser={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    );

    // useEffectが実行されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 10));

    const output = lastFrame();
    expect(output).toContain('j/k: 移動');
    expect(output).toContain('v: ブラウザで開く');
    expect(output).toContain('f: お気に入り解除');
    expect(output).toContain('p: ピン');
    expect(output).toContain('F: 通常モードに戻る');
  });

  it('記事が選択されていない場合は適切なメッセージを表示する', () => {
    mockArticleModel.getFavoriteArticles.mockReturnValue([]);

    const { lastFrame } = render(
      <FavoriteList
        articleModel={mockArticleModel}
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
