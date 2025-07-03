export interface ArticleResource {
  id: number;
  title: string;
  url: string;
  content: string | null;
  publishedAt: string;
  author: string | null;
}
