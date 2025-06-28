import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ArticleList } from './ArticleList.js';
import type { Article } from '../../models/types.js';

describe('ArticleList Component', () => {
  const mockArticles: Article[] = [
    {
      id: 1,
      feed_id: 1,
      title: 'Unread Article',
      url: 'https://example.com/article1',
      content: '<p>This is the content of article 1</p>',
      summary: 'Summary of article 1',
      author: 'Author 1',
      published_at: new Date('2024-01-01'),
      is_read: false,
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      feed_id: 1,
      title: 'Read and Favorite Article',
      url: 'https://example.com/article2',
      content: '<p>This is the content of article 2</p>',
      summary: 'Summary of article 2',
      author: 'Author 2',
      published_at: new Date('2024-01-02'),
      is_read: true,
      is_favorite: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  it('should render article list with titles', () => {
    const { lastFrame } = render(
      <ArticleList articles={mockArticles} selectedIndex={0} isActive={true} showPreview={false} />
    );

    const frame = lastFrame();
    expect(frame).toContain('Articles');
    expect(frame).toContain('> ● Unread Article');
    expect(frame).toContain('  ★ Read and Favorite Article');
  });

  it('should show unread indicator for unread articles', () => {
    const { lastFrame } = render(
      <ArticleList articles={mockArticles} selectedIndex={0} isActive={true} showPreview={false} />
    );

    const frame = lastFrame();
    expect(frame).toContain('● Unread Article');
  });

  it('should show favorite indicator for favorite articles', () => {
    const { lastFrame } = render(
      <ArticleList articles={mockArticles} selectedIndex={1} isActive={true} showPreview={false} />
    );

    const frame = lastFrame();
    expect(frame).toContain('★ Read and Favorite Article');
  });

  it('should show preview of selected article', () => {
    const { lastFrame } = render(
      <ArticleList articles={mockArticles} selectedIndex={0} isActive={true} showPreview={true} />
    );

    const frame = lastFrame();
    expect(frame).toContain('Summary of article 1');
  });

  it('should convert HTML in preview to plain text', () => {
    const articlesWithHtml: Article[] = [
      {
        ...mockArticles[0],
        summary: '<p>This is <strong>HTML</strong> content</p>',
        content: undefined,
      },
    ];

    const { lastFrame } = render(
      <ArticleList
        articles={articlesWithHtml}
        selectedIndex={0}
        isActive={true}
        showPreview={true}
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('This is HTML content');
    expect(frame).not.toContain('<p>');
    expect(frame).not.toContain('<strong>');
  });

  it('should show empty message when no articles', () => {
    const { lastFrame } = render(<ArticleList articles={[]} selectedIndex={0} isActive={true} />);

    expect(lastFrame()).toContain('No articles to display');
  });

  it('should truncate long preview text', () => {
    const longContent = Array(10).fill('This is a line of text.').join('\n');
    const articlesWithLongContent: Article[] = [
      {
        ...mockArticles[0],
        summary: longContent,
      },
    ];

    const { lastFrame } = render(
      <ArticleList
        articles={articlesWithLongContent}
        selectedIndex={0}
        isActive={true}
        showPreview={true}
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('...');
  });
});
