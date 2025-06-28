import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { FeedList } from './FeedList.js';
import type { Feed } from '../../models/types.js';

describe('FeedList Component', () => {
  const mockFeeds: Feed[] = [
    {
      id: 1,
      url: 'https://example.com/feed1.xml',
      title: 'Feed 1',
      description: 'Description 1',
      last_updated_at: new Date(1234567890000),
      created_at: new Date(1234567890000),
    },
    {
      id: 2,
      url: 'https://example.com/feed2.xml',
      title: 'Feed 2',
      description: 'Description 2',
      last_updated_at: new Date(1234567890000),
      created_at: new Date(1234567890000),
    },
  ];

  it('should render feed list with titles', () => {
    const { lastFrame } = render(<FeedList feeds={mockFeeds} selectedIndex={0} isActive={true} />);

    const frame = lastFrame();
    expect(frame).toContain('Feeds');
    expect(frame).toContain('> Feed 1');
    expect(frame).toContain('  Feed 2');
  });

  it('should show unread counts when provided', () => {
    const unreadCounts = new Map<number, number>([
      [1, 5],
      [2, 0],
    ]);

    const { lastFrame } = render(
      <FeedList feeds={mockFeeds} selectedIndex={0} isActive={true} unreadCounts={unreadCounts} />
    );

    const frame = lastFrame();
    expect(frame).toContain('> Feed 1 (5)');
    expect(frame).toContain('  Feed 2');
  });

  it('should show empty message when no feeds', () => {
    const { lastFrame } = render(<FeedList feeds={[]} selectedIndex={0} isActive={true} />);

    expect(lastFrame()).toContain("No feeds. Add one with 'termfeed add <url>'");
  });

  it('should not highlight when inactive', () => {
    const { lastFrame } = render(<FeedList feeds={mockFeeds} selectedIndex={1} isActive={false} />);

    const frame = lastFrame();
    expect(frame).toContain('  Feed 1');
    expect(frame).toContain('> Feed 2');
    // 非アクティブ時も選択は表示されるが、色付けはされない
  });
});
