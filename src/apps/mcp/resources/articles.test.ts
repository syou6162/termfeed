import { describe, it, expect, vi, beforeEach } from 'vitest';
import { URL } from 'node:url';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedModel } from '../../../models/feed.js';
import { registerArticleResources } from './articles.js';
import type { Article, Feed } from '@/types';

interface RegisteredResource {
  uri: string | ResourceTemplate;
  metadata: { title: string; description: string };
  handler: (
    uri: URL,
    variables?: Record<string, string | string[]>
  ) => { contents: Array<{ uri: string; mimeType: string; text: string }> };
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
      registerResource: vi.fn(
        (
          name: string,
          uriOrTemplate: string | ResourceTemplate,
          metadata: unknown,
          handler: unknown
        ) => {
          registeredResources.set(name, {
            uri: uriOrTemplate,
            metadata,
            handler,
          } as RegisteredResource);
        }
      ),
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
          rating: 0,
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
          rating: 0,
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

  describe('individual article resource', () => {
    beforeEach(() => {
      mockArticleModel = {
        findAll: vi.fn(),
        findById: vi.fn(),
      } as unknown as ArticleModel;

      mockFeedModel = {
        findAll: vi.fn(),
        findById: vi.fn(),
      } as unknown as FeedModel;
    });

    it('should register individual article resource', () => {
      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      expect(mockServer.registerResource).toHaveBeenCalledWith(
        'article',
        expect.any(ResourceTemplate),
        {
          title: 'Article Details',
          description: 'Get full details of a specific article',
        },
        expect.any(Function)
      );
    });

    it('should return article details for valid ID', () => {
      const mockArticle: Article = {
        id: 153,
        feed_id: 1,
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'Full article content',
        author: 'Test Author',
        published_at: new Date('2024-01-01'),
        is_read: false,
        is_favorite: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockFeed: Feed = {
        id: 1,
        url: 'https://example.com/feed',
        title: 'Test Feed',
        rating: 0,
        last_updated_at: new Date(),
        created_at: new Date(),
      };

      vi.mocked(mockArticleModel.findById).mockReturnValue(mockArticle);
      vi.mocked(mockFeedModel.findById).mockReturnValue(mockFeed);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const articleResource = registeredResources.get('article');
      const result = articleResource?.handler(new URL('articles://article/153'), { id: '153' });

      expect(mockArticleModel.findById).toHaveBeenCalledWith(153);
      expect(mockFeedModel.findById).toHaveBeenCalledWith(1);

      const content = JSON.parse(result?.contents[0].text ?? '{}') as ArticleResourceJSON;
      expect(content).toMatchObject({
        id: 153,
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'Full article content',
        feedTitle: 'Test Feed',
        author: 'Test Author',
      });
    });

    it('should return error for invalid article ID', () => {
      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const articleResource = registeredResources.get('article');
      const result = articleResource?.handler(new URL('articles://article/invalid'), {
        id: 'invalid',
      });

      const content = JSON.parse(result?.contents[0].text ?? '{}') as { error: string };
      expect(content).toEqual({ error: 'Invalid article ID' });
    });

    it('should return error for non-existent article', () => {
      vi.mocked(mockArticleModel.findById).mockReturnValue(null);

      registerArticleResources(mockServer, mockArticleModel, mockFeedModel);

      const articleResource = registeredResources.get('article');
      const result = articleResource?.handler(new URL('articles://article/999'), { id: '999' });

      expect(mockArticleModel.findById).toHaveBeenCalledWith(999);

      const content = JSON.parse(result?.contents[0].text ?? '{}') as { error: string };
      expect(content).toEqual({ error: 'Article not found' });
    });
  });
});
