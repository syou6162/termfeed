import type { Feed, Article } from '../../models/types.js';

export type ViewMode = 'feeds' | 'articles';

export type AppState = {
  viewMode: ViewMode;
  feeds: Feed[];
  articles: Article[];
  selectedFeedId: number | null;
  selectedArticleId: number | null;
  loading: boolean;
  error: string | null;
};

export type KeyBinding = {
  key: string;
  description: string;
  action: () => void;
};

export type Pane = 'left' | 'right';

export type FocusState = {
  activePane: Pane;
  leftPaneIndex: number;
  rightPaneIndex: number;
};