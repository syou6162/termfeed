export interface ArticleResource {
  id: number;
  title: string;
  url: string;
  content: string | null;
  publishedAt: string;
  feedTitle: string;
  author: string | null;
}

export interface ResourceSchema {
  template: string;
  description: string;
  parameters: Record<
    string,
    {
      type: string;
      description: string;
    }
  >;
}

export interface ArticleListResponse {
  articles: ArticleResource[];
  _schema: {
    availableResources: ResourceSchema[];
  };
}
