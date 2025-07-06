import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { ArticleList } from '../ArticleList.js';
import type { Article } from '../../../../types/index.js';

// convertHtmlToTextモック
vi.mock('../../utils/html.js', () => ({
  convertHtmlToText: vi.fn((html: string) => html.replace(/<[^>]*>/g, '')),
}));

describe('ArticleList', () => {
  const createMockArticle = (
    id: number,
    options: {
      is_favorite?: boolean;
      title?: string;
      content?: string;
      author?: string;
      published_at?: Date;
    } = {}
  ): Article => ({
    id,
    feed_id: 1,
    url: `https://example.com/article${id}`,
    title: options.title || `Article ${id}`,
    content: options.content || `Content for article ${id}`,
    summary: `Summary ${id}`,
    author: options.author || undefined,
    published_at: options.published_at || new Date('2024-01-01T12:00:00Z'),
    is_read: false,
    is_favorite: options.is_favorite || false,
    thumbnail_url: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const defaultProps = {
    articles: [createMockArticle(1)],
    scrollOffset: 0,
    onScrollOffsetChange: vi.fn(),
    isPinned: false,
  };

  describe('未読記事がない場合', () => {
    it('未読記事がない旨のメッセージを表示する', () => {
      const { lastFrame } = render(<ArticleList {...defaultProps} articles={[]} />);

      const output = lastFrame();
      expect(output).toContain('未読記事がありません');
      expect(output).toContain('ヒント: `r` でフィードを更新できます');
    });
  });

  describe('記事が選択されていない場合', () => {
    it('記事を選択してくださいというメッセージを表示する', () => {
      const { lastFrame } = render(<ArticleList {...defaultProps} selectedArticle={undefined} />);

      const output = lastFrame();
      expect(output).toContain('記事を選択してください');
    });

    it('未読件数を表示する', () => {
      const articles = [createMockArticle(1), createMockArticle(2)];
      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={articles} selectedArticle={undefined} />
      );

      const output = lastFrame();
      expect(output).toContain('未読2件');
    });
  });

  describe('記事詳細表示', () => {
    it('記事のタイトル、公開日、URLを表示する', () => {
      const article = createMockArticle(1, {
        title: 'Test Article Title',
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      expect(output).toContain('Test Article Title');
      expect(output).toContain('公開日: 2024年1月15日');
      expect(output).toContain('URL: https://example.com/article1');
    });

    it('著者がある場合は著者情報を表示する', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      expect(output).toContain('著者: John Doe');
    });
  });

  describe('お気に入り・ピン表示ロジック', () => {
    it('お気に入りのみの場合、★お気に入りを表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('★ お気に入り');
      expect(output).not.toContain('📌 ピン');
    });

    it('ピンのみの場合、📌ピンを表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: false,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('📌 ピン');
      expect(output).not.toContain('★ お気に入り');
    });

    it('お気に入りとピン両方がある場合、両方を表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('★ お気に入り');
      expect(output).toContain('📌 ピン');
    });

    it('お気に入りもピンもない場合、どちらも表示しない', () => {
      const article = createMockArticle(1, {
        is_favorite: false,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={false}
        />
      );

      const output = lastFrame();
      expect(output).not.toContain('★ お気に入り');
      expect(output).not.toContain('📌 ピン');
    });
  });

  describe('区切り文字の条件分岐', () => {
    it('著者がない場合でもお気に入りの区切り文字が正しく表示される', () => {
      const article = createMockArticle(1, {
        author: undefined,
        is_favorite: true,
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      // 「公開日: ... | ★ お気に入り」の形式
      expect(output).toMatch(/公開日:.*\|.*★ お気に入り/);
    });

    it('著者がある場合のお気に入りの区切り文字が正しく表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: true,
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      // 「公開日: ... | 著者: John Doe | ★ お気に入り」の形式
      expect(output).toMatch(/著者: John Doe.*\|.*★ お気に入り/);
    });

    it('著者とお気に入りがある場合のピンの区切り文字が正しく表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: true,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const output = lastFrame();
      // 「... | ★ お気に入り | 📌 ピン」の形式
      expect(output).toMatch(/★ お気に入り.*\|.*📌 ピン/);
    });

    it('著者のみがある場合のピンの区切り文字が正しく表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: false,
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const output = lastFrame();
      // 「著者: John Doe | 📌 ピン」の形式
      expect(output).toMatch(/著者: John Doe.*\|.*📌 ピン/);
    });
  });

  describe('コンテンツ表示', () => {
    it('記事が選択されたときコンポーネントがレンダリングされる', () => {
      const article = createMockArticle(1, {
        content: '<p>This is test content</p>',
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      // タイトルと基本情報が表示されることを確認
      expect(output).toContain('Article 1');
      expect(output).toContain('公開日:');
    });

    it('コンテンツがない場合でもエラーにならない', () => {
      const article = createMockArticle(1, {
        content: '',
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const output = lastFrame();
      expect(output).toContain('Article 1'); // タイトルは表示される
    });
  });

  describe('スクロール機能', () => {
    it('onScrollOffsetChangeが呼ばれる', () => {
      const onScrollOffsetChange = vi.fn();
      const article = createMockArticle(1);

      render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          onScrollOffsetChange={onScrollOffsetChange}
        />
      );

      // 記事選択時にスクロール位置がリセットされる
      expect(onScrollOffsetChange).toHaveBeenCalledWith(0);
    });
  });
});
