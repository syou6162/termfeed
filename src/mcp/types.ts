export interface ArticleResource {
  id: number;
  title: string;
  url: string;
  content: string | null;
  publishedAt: string;
  feedTitle: string;
  author: string | null;
}

export interface ResourceQueryParams {
  limit?: number;
}
