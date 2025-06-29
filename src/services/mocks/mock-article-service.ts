import type { Article, ArticleService } from '@/types';

export class MockArticleService implements ArticleService {
  private articles: Article[] = [
    {
      id: 1,
      feed_id: 1,
      title: 'Sample Article 1',
      url: 'https://example.com/article1',
      content: 'This is sample content for article 1.',
      author: 'John Doe',
      published_at: new Date('2024-01-01'),
      is_read: false,
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      feed_id: 1,
      title: 'Sample Article 2',
      url: 'https://example.com/article2',
      content: 'This is sample content for article 2.',
      author: 'Jane Smith',
      published_at: new Date('2024-01-02'),
      is_read: true,
      is_favorite: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      feed_id: 2,
      title: 'Sample Article 3',
      url: 'https://example.com/article3',
      content: 'This is sample content for article 3.',
      published_at: new Date('2024-01-03'),
      is_read: false,
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  getArticles(options?: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Article[] {
    let filtered = [...this.articles];

    if (options?.feedId !== undefined) {
      filtered = filtered.filter((article) => article.feed_id === options.feedId);
    }
    if (options?.isRead !== undefined) {
      filtered = filtered.filter((article) => article.is_read === options.isRead);
    }
    if (options?.isFavorite !== undefined) {
      filtered = filtered.filter((article) => article.is_favorite === options.isFavorite);
    }

    // ソート: 新しい記事が上に
    filtered.sort((a, b) => b.published_at.getTime() - a.published_at.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  getArticleById(articleId: number): Article | null {
    return this.articles.find((a) => a.id === articleId) || null;
  }

  markAsRead(articleId: number): boolean {
    const article = this.articles.find((a) => a.id === articleId);
    if (!article) return false;
    article.is_read = true;
    article.updated_at = new Date();
    return true;
  }

  markAsUnread(articleId: number): boolean {
    const article = this.articles.find((a) => a.id === articleId);
    if (!article) return false;
    article.is_read = false;
    article.updated_at = new Date();
    return true;
  }

  toggleFavorite(articleId: number): boolean {
    const article = this.articles.find((a) => a.id === articleId);
    if (!article) return false;
    article.is_favorite = !article.is_favorite;
    article.updated_at = new Date();
    return true;
  }

  getUnreadCount(feedId?: number): number {
    let filtered = this.articles;
    if (feedId !== undefined) {
      filtered = filtered.filter((article) => article.feed_id === feedId);
    }
    return filtered.filter((article) => !article.is_read).length;
  }

  getTotalCount(feedId?: number): number {
    if (feedId !== undefined) {
      return this.articles.filter((article) => article.feed_id === feedId).length;
    }
    return this.articles.length;
  }
}
