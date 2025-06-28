import { Box, Text } from 'ink';
import type { Article } from '../../models/types.js';
import { formatSummary } from '../utils/html.js';
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

export function ArticleList({ articles, selectedIndex, selectedArticle, feedTitle }: ArticleListProps) {
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

  const renderArticleDetail = () => {
    if (!selectedArticle) {
      return (
        <Box>
          <Text color="gray" italic>
            記事を選択してください
          </Text>
        </Box>
      );
    }

    const summary = formatSummary(selectedArticle.summary || selectedArticle.content, 400);
    const publishedDate = selectedArticle.published_at.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Box flexDirection="column" borderStyle="single" borderTop paddingTop={1} paddingX={1}>
        <Text bold color="green">
          {selectedArticle.title}
        </Text>
        <Box marginTop={1}>
          <Text color="gray">公開日: {publishedDate}</Text>
          {selectedArticle.author && (
            <Text color="cyan"> | 著者: {selectedArticle.author}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">URL: {selectedArticle.url}</Text>
        </Box>
        {summary && (
          <Box marginTop={1}>
            <Text>{summary}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            状態: {selectedArticle.is_read ? '既読' : '未読'}
            {selectedArticle.is_favorite ? ' | ★お気に入り' : ''}
          </Text>
        </Box>
      </Box>
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
      <Box marginTop={1} height="40%">
        <SelectableList
          items={articleItems}
          selectedIndex={selectedIndex}
          renderItem={renderArticleItem}
        />
      </Box>
      <Box marginTop={1} height="55%" flexGrow={1}>
        {renderArticleDetail()}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          j/k:記事選択 a:次のサイト s:前のサイト l/Enter:ブラウザで開く m:既読切替 f:お気に入り切替 r:更新 q:終了
        </Text>
      </Box>
    </Box>
  );
}
