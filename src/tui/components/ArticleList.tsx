import React from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from './SelectableList.js';
import { htmlToPlainText, truncateLines } from '../utils/html.js';
import type { Article } from '../../models/types.js';

type ArticleListProps = {
  articles: Article[];
  selectedIndex: number;
  isActive: boolean;
  showPreview?: boolean;
};

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  selectedIndex,
  isActive,
  showPreview = true,
}) => {
  const renderArticle = (article: Article) => {
    const readIndicator = article.is_read ? '' : '●';
    const favoriteIndicator = article.is_favorite ? '★' : '';
    const indicators = [readIndicator, favoriteIndicator].filter(Boolean).join(' ');
    const prefix = indicators ? `${indicators} ` : '';
    return `${prefix}${article.title}`;
  };

  const selectedArticle = articles[selectedIndex];
  const previewText =
    selectedArticle && showPreview && (selectedArticle.summary || selectedArticle.content)
      ? truncateLines(htmlToPlainText(selectedArticle.summary || selectedArticle.content || ''), 5)
      : null;

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text bold>Articles</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <SelectableList
          items={articles}
          selectedIndex={selectedIndex}
          renderItem={renderArticle}
          isActive={isActive}
          emptyMessage="No articles to display"
        />
        {previewText && (
          <Box marginTop={1} paddingTop={1} borderStyle="single" borderColor="gray">
            <Text color="gray">{previewText}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
