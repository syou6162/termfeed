// ドメインモデルの型定義

export type Feed = {
  id: number;
  url: string;
  title: string;
  description?: string;
  rating: number;
  last_updated_at: Date;
  created_at: Date;
};

export type Article = {
  id: number;
  feed_id: number;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at: Date;
  is_read: boolean;
  thumbnail_url?: string;
  created_at: Date;
  updated_at: Date;
};

// DBから取得したArticleの生データ
export type ArticleRow = {
  id: number;
  feed_id: number;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at: number;
  is_read: number;
  thumbnail_url?: string;
  created_at: number;
  updated_at: number;
};

export type CreateFeedInput = {
  url: string;
  title: string;
  description?: string;
  rating: number;
};

export type UpdateArticleInput = {
  is_read?: boolean;
};

export type Pin = {
  id: number;
  article_id: number;
  created_at: Date;
};

export type Favorite = {
  id: number;
  article_id: number;
  created_at: Date;
};
