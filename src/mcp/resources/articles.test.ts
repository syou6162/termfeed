import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../models/article.js';
import { FeedModel } from '../../models/feed.js';
import { registerArticleResources } from './articles.js';
import type { Article, Feed } from '../../models/types.js';

describe('registerArticleResources', () => {
  let mockServer: McpServer;
  let mockArticleModel: ArticleModel;
  let mockFeedModel: FeedModel;
  let registeredResources: Map<string, any>;

  beforeEach(() => {
    registeredResources = new Map();
    
    mockServer = {
      registerResource: vi.fn((name, uri, metadata, handler) => {
        registeredResources.set(name, { uri, metadata, handler });
      }),
    } as any;

    mockArticleModel = {
      findAll: vi.fn(),
    } as any;

    mockFeedModel = {
      findAll: vi.fn(),
    } as any;
  });

  describe('unread articles resource', () => {
    it('should register unread articles resource', () => {
      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      expect(mockServer.registerResource).toHaveBeenCalledWith(
        'unread',
        'articles://unread',
        {
          title: 'Unread Articles',
          description: 'Get unread articles from your RSS feeds',
        },
        expect.any(Function)
      );
    });

    it('should return unread articles with feed titles', async () => {
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
        },
      ];

      const mockFeeds: Feed[] = [
        {
          id: 1,
          url: 'https://example.com/feed',
          title: 'Example Feed',
          last_updated_at: new Date(),
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue(mockFeeds);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      const result = await unreadResource.handler(new URL('articles://unread?limit=10'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_read: false, limit: 10 });
      expect(mockFeedModel.findAll).toHaveBeenCalled();

      const contents = JSON.parse(result.contents[0].text);
      expect(contents).toHaveLength(1);
      expect(contents[0]).toMatchObject({
        title: 'Article 1',
        url: 'https://example.com/1',
        content: 'Content 1',
        feedTitle: 'Example Feed',
        author: 'Author 1',
      });
    });

    it('should handle missing feed gracefully', async () => {
      const mockArticles: Article[] = [
        {
          id: 1,
          feed_id: 999, // Non-existent feed
          title: 'Article 1',
          url: 'https://example.com/1',
          published_at: new Date('2024-01-01'),
          is_read: false,
          is_favorite: false,
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue([]);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      const result = await unreadResource.handler(new URL('articles://unread'));

      const contents = JSON.parse(result.contents[0].text);
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
          description: 'Get your favorite articles',
        },
        expect.any(Function)
      );
    });

    it('should return favorite articles with feed titles', async () => {
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
        },
      ];

      const mockFeeds: Feed[] = [
        {
          id: 1,
          url: 'https://example.com/feed',
          title: 'Example Feed',
          last_updated_at: new Date(),
        },
      ];

      vi.mocked(mockArticleModel.findAll).mockReturnValue(mockArticles);
      vi.mocked(mockFeedModel.findAll).mockReturnValue(mockFeeds);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const favResource = registeredResources.get('favorites');
      const result = await favResource.handler(new URL('articles://favorites?limit=20'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_favorite: true, limit: 20 });
      
      const contents = JSON.parse(result.contents[0].text);
      expect(contents[0]).toMatchObject({
        title: 'Favorite Article',
        url: 'https://example.com/fav',
        content: 'Favorite content',
        feedTitle: 'Example Feed',
      });
    });
  });

  describe('query parameters', () => {
    it('should use default limit when not specified', async () => {
      vi.mocked(mockArticleModel.findAll).mockReturnValue([]);
      vi.mocked(mockFeedModel.findAll).mockReturnValue([]);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const unreadResource = registeredResources.get('unread');
      await unreadResource.handler(new URL('articles://unread'));

      expect(mockArticleModel.findAll).toHaveBeenCalledWith({ is_read: false, limit: 50 });
    });
  });
});