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
    it('お気に入りのみの場合、公開日と同じ行に★お気に入りを表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
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

      // 公開日と同じ行にお気に入りが表示されることを検証
      expect(output).toMatch(/公開日: 2024年1月15日.*\|.*★ お気に入り/);

      // ピンは表示されない
      expect(output).not.toContain('📌 ピン');

      // 独立した行にお気に入りが表示されていないことを確認
      expect(output).not.toMatch(/★ お気に入り[\s\S]*?公開日:/);
    });

    it('ピンのみの場合、公開日と同じ行に📌ピンを表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: false,
        published_at: new Date('2024-01-15T10:30:00Z'),
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

      // 公開日と同じ行にピンが表示されることを検証
      expect(output).toMatch(/公開日: 2024年1月15日.*\|.*📌 ピン/);

      // お気に入りは表示されない
      expect(output).not.toContain('★ お気に入り');

      // 独立した行にピンが表示されていないことを確認
      expect(output).not.toMatch(/📌 ピン[\s\S]*?公開日:/);
    });

    it('お気に入りとピン両方がある場合、公開日と同じ行に両方を表示する', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
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

      // 公開日と同じ行にお気に入りとピンが表示されることを検証
      expect(output).toMatch(/公開日: 2024年1月15日.*\|.*★ お気に入り.*\|.*📌 ピン/);

      // 独立した行にそれぞれが表示されていないことを確認
      expect(output).not.toMatch(/★ お気に入り[\s\S]*?公開日:/);
      expect(output).not.toMatch(/📌 ピン[\s\S]*?公開日:/);
    });

    it('お気に入りもピンもない場合、公開日行に追加情報は表示しない', () => {
      const article = createMockArticle(1, {
        is_favorite: false,
        published_at: new Date('2024-01-15T10:30:00Z'),
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

      // お気に入りもピンも表示されない
      expect(output).not.toContain('★ お気に入り');
      expect(output).not.toContain('📌 ピン');

      // 公開日は正常に表示される
      expect(output).toContain('公開日: 2024年1月15日');
    });
  });

  describe('区切り文字の条件分岐（同一行での表示検証）', () => {
    it('著者がない場合、公開日と同一行にお気に入りが適切な区切り文字で表示される', () => {
      const article = createMockArticle(1, {
        author: undefined,
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const frameOutput = lastFrame()!;
      const lines = frameOutput.split('\n');

      // 公開日とお気に入りが同一行に表示されることを検証
      const infoLine = lines.find(
        (line) => line.includes('公開日: 2024年1月15日') && line.includes('★ お気に入り')
      );

      expect(infoLine).toBeDefined();
      expect(infoLine!).toMatch(/公開日: 2024年1月15日.*\|.*★ お気に入り/);

      // 著者情報がないことを確認
      expect(infoLine!).not.toContain('著者:');
    });

    it('著者がある場合、公開日・著者・お気に入りが同一行に適切な区切り文字で表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[article]} selectedArticle={article} />
      );

      const frameOutput = lastFrame()!;
      const lines = frameOutput.split('\n');

      // 公開日、著者、お気に入りが同一行に表示されることを検証
      const infoLine = lines.find(
        (line) =>
          line.includes('公開日: 2024年1月15日') &&
          line.includes('著者: John Doe') &&
          line.includes('★ お気に入り')
      );

      expect(infoLine).toBeDefined();
      expect(infoLine!).toMatch(/公開日: 2024年1月15日.*\|.*著者: John Doe.*\|.*★ お気に入り/);
    });

    it('著者とお気に入りがある場合、ピンも同一行に適切な区切り文字で表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const frameOutput = lastFrame()!;
      const lines = frameOutput.split('\n');

      // すべての情報が同一行に表示されることを検証
      const infoLine = lines.find(
        (line) =>
          line.includes('公開日: 2024年1月15日') &&
          line.includes('著者: John Doe') &&
          line.includes('★ お気に入り') &&
          line.includes('📌 ピン')
      );

      expect(infoLine).toBeDefined();
      expect(infoLine!).toMatch(
        /公開日: 2024年1月15日.*\|.*著者: John Doe.*\|.*★ お気に入り.*\|.*📌 ピン/
      );
    });

    it('著者のみがある場合、公開日・著者・ピンが同一行に適切な区切り文字で表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: false,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const frameOutput = lastFrame()!;
      const lines = frameOutput.split('\n');

      // 公開日、著者、ピンが同一行に表示されることを検証
      const infoLine = lines.find(
        (line) =>
          line.includes('公開日: 2024年1月15日') &&
          line.includes('著者: John Doe') &&
          line.includes('📌 ピン')
      );

      expect(infoLine).toBeDefined();
      expect(infoLine!).toMatch(/公開日: 2024年1月15日.*\|.*著者: John Doe.*\|.*📌 ピン/);

      // お気に入りがないことを確認
      expect(infoLine!).not.toContain('★ お気に入り');
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

  describe('レイアウト構造の検証', () => {
    it('お気に入り・ピンが独立した行として表示されていない', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const frameOutput = lastFrame()!;
      const lines = frameOutput.split('\n');

      // お気に入りとピンの情報が含まれる行を探す
      const favoriteAndPinLine = lines.find(
        (line) => line.includes('★ お気に入り') && line.includes('📌 ピン')
      );

      // その行には公開日も含まれている必要がある
      expect(favoriteAndPinLine).toBeDefined();
      expect(favoriteAndPinLine!).toMatch(/公開日:/);

      // お気に入りやピンが単独の行として存在しないことを確認
      const favoriteOnlyLines = lines.filter(
        (line) => line.includes('★ お気に入り') && !line.includes('公開日:')
      );
      const pinOnlyLines = lines.filter(
        (line) => line.includes('📌 ピン') && !line.includes('公開日:')
      );

      expect(favoriteOnlyLines).toHaveLength(0);
      expect(pinOnlyLines).toHaveLength(0);
    });

    it('著者情報とお気に入り・ピンが適切な順序で同一行に表示される', () => {
      const article = createMockArticle(1, {
        author: 'John Doe',
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
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

      // 正しい順序: 公開日 -> 著者 -> お気に入り -> ピン
      expect(output).toMatch(
        /公開日: 2024年1月15日.*\|.*著者: John Doe.*\|.*★ お気に入り.*\|.*📌 ピン/
      );
    });

    it('修正前の独立行レイアウトとは異なる構造になっている', () => {
      const article = createMockArticle(1, {
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      const frameOutput = lastFrame()!;

      // 修正前のような独立行パターンが存在しないことを確認
      // 例: お気に入りが単独で表示される行
      expect(frameOutput).not.toMatch(/^\s*★ お気に入り\s*$/m);
      expect(frameOutput).not.toMatch(/^\s*📌 ピン\s*$/m);

      // タイトル直後にお気に入り・ピンの独立行がないことを確認
      const lines = frameOutput.split('\n');
      const titleLineIndex = lines.findIndex((line) => line.includes('Article 1'));
      if (titleLineIndex !== -1 && titleLineIndex + 1 < lines.length) {
        const nextLine = lines[titleLineIndex + 1];
        expect(nextLine).not.toMatch(/^\s*★ お気に入り/);
        expect(nextLine).not.toMatch(/^\s*📌 ピン/);
      }
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

  describe('スナップショットテスト（レイアウト破壊的変更の検出）', () => {
    it('お気に入りのみの記事レイアウト', () => {
      const article = createMockArticle(1, {
        title: 'Sample Article Title',
        author: 'John Doe',
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
        content: '<p>Sample article content with HTML tags</p>',
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={false}
        />
      );

      // お気に入りが公開日の横に表示されるレイアウトをスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-favorite-only');
    });

    it('ピンのみの記事レイアウト', () => {
      const article = createMockArticle(1, {
        title: 'Sample Article Title',
        author: 'Jane Smith',
        is_favorite: false,
        published_at: new Date('2024-01-15T10:30:00Z'),
        content: '<p>Sample article content with HTML tags</p>',
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      // ピンが公開日の横に表示されるレイアウトをスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-pin-only');
    });

    it('お気に入り＋ピン両方の記事レイアウト', () => {
      const article = createMockArticle(1, {
        title: 'Sample Article Title',
        author: 'Bob Wilson',
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
        content: '<p>Sample article content with HTML tags</p>',
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={true}
        />
      );

      // お気に入り＋ピン両方が公開日の横に表示されるレイアウトをスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-favorite-and-pin');
    });

    it('著者なし＋お気に入りの記事レイアウト', () => {
      const article = createMockArticle(1, {
        title: 'Sample Article Title',
        author: undefined,
        is_favorite: true,
        published_at: new Date('2024-01-15T10:30:00Z'),
        content: '<p>Sample article content with HTML tags</p>',
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={false}
        />
      );

      // 著者なしでお気に入りが公開日の横に表示されるレイアウトをスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-no-author-favorite');
    });

    it('通常の記事レイアウト（お気に入り・ピンなし）', () => {
      const article = createMockArticle(1, {
        title: 'Sample Article Title',
        author: 'Alice Johnson',
        is_favorite: false,
        published_at: new Date('2024-01-15T10:30:00Z'),
        content: '<p>Sample article content with HTML tags</p>',
      });

      const { lastFrame } = render(
        <ArticleList
          {...defaultProps}
          articles={[article]}
          selectedArticle={article}
          isPinned={false}
        />
      );

      // 通常の記事表示レイアウトをスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-normal');
    });

    it('未読記事なしの状態', () => {
      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={[]} selectedArticle={undefined} />
      );

      // 未読記事なしのメッセージ表示をスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-no-articles');
    });

    it('記事未選択の状態', () => {
      const articles = [createMockArticle(1), createMockArticle(2)];
      const { lastFrame } = render(
        <ArticleList {...defaultProps} articles={articles} selectedArticle={undefined} />
      );

      // 記事未選択時の表示をスナップショット
      expect(lastFrame()).toMatchSnapshot('article-layout-no-selection');
    });
  });
});
