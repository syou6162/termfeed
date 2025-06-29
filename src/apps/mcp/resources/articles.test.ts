import { describe, it, expect, vi, beforeEach } from 'vitest';
import { URL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedModel } from '../../../models/feed.js';
import { registerArticleResources } from './articles.js';
import type { Article, Feed } from '@/types';

interface RegisteredResource {
  uri: string;
  metadata: { title: string; description: string };
  handler: (uri: URL) => { contents: Array<{ uri: string; mimeType: string; text: string }> };
}

interface ArticleResourceJSON {
  id: number;
  title: string;
  url: string;
  content: string | null;
  feedTitle: string;
  author: string | null;
  publishedAt?: string;
}

describe('registerArticleResources', () => {
  let mockServer: McpServer;
  let mockArticleModel: ArticleModel;
  let mockFeedModel: FeedModel;
  let registeredResources: Map<string, RegisteredResource>;

  beforeEach(() => {
    registeredResources = new Map();

    mockServer = {
      registerResource: vi.fn((name: string, uri: string, metadata: unknown, handler: unknown) => {
        registeredResources.set(name, { uri, metadata, handler } as RegisteredResource);
      }),
    } as unknown as McpServer;

    mockArticleModel = {
      findAll: vi.fn(),
    } as unknown as ArticleModel;

    mockFeedModel = {
      findAll: vi.fn(),
    } as unknown as FeedModel;
  });

  describe('unread articles resource', () => {
    it('should register unread articles resource', () => {
      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      expect(mockServer.registerResource).toHaveBeenCalledWith(
        'unread',
        'articles://unread',
        {
          title: 'Unread Articles',
          description: 'Get unread articles from your RSS feeds (default: 10 items)',
        },
        expect.any(Function)
      );
    });

    it('should return unread articles with feed titles', () => {
      const mockArticles: Article[] = [
        {
          id: 1,
          feed_id: 1,
          title: 'Article 1',
          url: 'https://example.com/1',
          content: 'Content 1',
          author: 'Author 1',
          published_at: new Date('2024-01-01'),
          is_read: false,
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockFeeds: Feed[] = [
        {
          id: 1,
          url: 'https://example.com/feed',
          title: 'Example Feed',
          last_updated_at: new Date(),
          created_at: new Date(),
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue(mockFeeds);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      const result = unreadResource?.handler(new URL('articles://unread'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_read: false, limit: 10 });
      expect(mockFeedModel.findAll).toHaveBeenCalled();

      const contents = JSON.parse(result?.contents[0].text ?? '[]') as ArticleResourceJSON[];
      expect(contents).toHaveLength(1);
      expect(contents[0]).toMatchObject({
        id: 1,
        title: 'Article 1',
        url: 'https://example.com/1',
        content: 'Content 1...',
        feedTitle: 'Example Feed',
        author: 'Author 1',
      });
    });

    it('should handle missing feed gracefully', () => {
      const mockArticles: Article[] = [
        {
          id: 1,
          feed_id: 999, // Non-existent feed
          title: 'Article 1',
          url: 'https://example.com/1',
          published_at: new Date('2024-01-01'),
          is_read: false,
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue([]);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      const result = unreadResource?.handler(new URL('articles://unread'));

      const contents = JSON.parse(result?.contents[0].text ?? '[]') as ArticleResourceJSON[];
      expect(contents[0].feedTitle).toBe('Unknown Feed');
    });
  });

  describe('favorite articles resource', () => {
    it('should register favorite articles resource', () => {
      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      expect(mockServer.registerResource).toHaveBeenCalledWith(
        'favorites',
        'articles://favorites',
        {
          title: 'Favorite Articles',
          description: 'Get your favorite articles (default: 10 items)',
        },
        expect.any(Function)
      );
    });

    it('should return favorite articles with feed titles', () => {
      const mockArticles: Article[] = [
        {
          id: 1,
          feed_id: 1,
          title: 'Favorite Article',
          url: 'https://example.com/fav',
          content: 'Favorite content',
          published_at: new Date('2024-01-01'),
          is_read: true,
          is_favorite: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockFeeds: Feed[] = [
        {
          id: 1,
          url: 'https://example.com/feed',
          title: 'Example Feed',
          last_updated_at: new Date(),
          created_at: new Date(),
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue(mockFeeds);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const favResource = registeredResources.get('favorites');
      const result = favResource?.handler(new URL('articles://favorites'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_favorite: true, limit: 10 });

      const contents = JSON.parse(result?.contents[0].text ?? '[]') as ArticleResourceJSON[];
      expect(contents[0]).toMatchObject({
        id: 1,
        title: 'Favorite Article',
        url: 'https://example.com/fav',
        content: 'Favorite content...',
        feedTitle: 'Example Feed',
      });
    });
  });

  describe('query parameters', () => {
    it('should use default limit when not specified', () => {
      vi.mocked(mockArticleModel.findAll).mockReturnValue([]);
      vi.mocked(mockFeedModel.findAll).mockReturnValue([]);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      unreadResource?.handler(new URL('articles://unread'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_read: false, limit: 10 });
    });
  });
});
