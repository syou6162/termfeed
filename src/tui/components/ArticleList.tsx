import { Box, Text } from 'ink';
import type { Article } from '../../models/types.js';
import { SelectableList } from './SelectableList.js';

type ArticleListItem = {
  id: number;
  displayText: string;
  badge?: string;
  isRead?: boolean;
  isFavorite?: boolean;
};

type ArticleListProps = {
  articles: Article[];
  selectedIndex: number;
  selectedArticle?: Article;
  feedTitle?: string;
};

export function ArticleList({ articles, selectedIndex, feedTitle }: ArticleListProps) {
  const articleItems: ArticleListItem[] = articles.map((article) => ({
    id: article.id || 0,
    displayText: article.title,
    isRead: article.is_read,
    isFavorite: article.is_favorite,
  }));

  const renderArticleItem = (item: ArticleListItem, isSelected: boolean) => {
    const prefix = isSelected ? '>' : ' ';
    const favoriteMarker = item.isFavorite ? '★ ' : '';
    const readMarker = item.isRead === false ? '● ' : '';
    const selectedStyle = isSelected ? { color: 'blue', bold: true } : {};

    return (
      <Text key={item.id} {...selectedStyle}>
        {prefix} {favoriteMarker}
        {readMarker}
        {item.displayText}
      </Text>
    );
  };


  if (articles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="blue">
          記事一覧{feedTitle && ` - ${feedTitle}`}
        </Text>
        <Box marginTop={1} justifyContent="center" alignItems="center" height={5}>
          <Text color="gray" italic>
            記事がありません
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">ヒント: `r` でフィードを更新できます</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box>
        <Text bold color="blue">
          記事一覧{feedTitle && ` - ${feedTitle}`} ({articles.length}件)
        </Text>
      </Box>
      <Box marginTop={1} flexGrow={1}>
        <SelectableList
          items={articleItems}
          selectedIndex={selectedIndex}
          renderItem={renderArticleItem}
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          j/k:記事選択 a/s:フィード選択 l/Enter:ブラウザで開く m:既読切替 f:お気に入り切替 r:更新 q:終了
        </Text>
      </Box>
    </Box>
  );
}
