import { Box, Text } from 'ink';
import type { Article } from '../../models/types.js';
import { formatSummary } from '../utils/html.js';

type ArticleListProps = {
  articles: Article[];
  selectedArticle?: Article;
};

export function ArticleList({
  articles,
  selectedArticle,
}: ArticleListProps) {
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
          {selectedArticle.author && <Text color="cyan"> | 著者: {selectedArticle.author}</Text>}
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
      <Box flexDirection="column" height="100%" padding={1}>
        <Box justifyContent="center" alignItems="center" height="95%" flexGrow={1}>
          <Box flexDirection="column" alignItems="center">
            <Text color="gray" italic>
              未読記事がありません
            </Text>
            <Text color="yellow">ヒント: `r` でフィードを更新できます</Text>
          </Box>
        </Box>
        <Box marginTop={1} justifyContent="center">
          <Text color="gray" dimColor>
            ? でヘルプ表示
          </Text>
        </Box>
      </Box>
    );
  }

  // articlesは既に未読記事のみ
  const unreadCount = articles.length;
  const currentUnreadIndex = articles.findIndex(article => article.id === selectedArticle?.id);
  const unreadPosition = currentUnreadIndex !== -1 ? currentUnreadIndex + 1 : 0;

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box height="95%" flexGrow={1}>
        {renderArticleDetail()}
      </Box>
      <Box marginTop={1} justifyContent="space-between" alignItems="center">
        <Text color="gray" dimColor>
          ? でヘルプ表示
        </Text>
        <Text color="gray">
          {unreadPosition > 0 
            ? `${unreadPosition}/${unreadCount}件` 
            : `未読${unreadCount}件`}
        </Text>
      </Box>
    </Box>
  );
}
