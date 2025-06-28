export interface Feed {
  id?: number;
  url: string;
  title: string;
  description?: string;
  last_updated_at: Date;
  created_at?: Date;
}

export interface Article {
  id?: number;
  feed_id: number;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at: Date;
  is_read: boolean;
  is_favorite: boolean;
  thumbnail_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateFeedInput {
  url: string;
  title: string;
  description?: string;
}

export interface UpdateArticleInput {
  is_read?: boolean;
  is_favorite?: boolean;
}
