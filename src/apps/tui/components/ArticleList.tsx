import { Box, Text, useStdout } from 'ink';
import { useState, useEffect } from 'react';
import type { Article } from '../../../types/index.js';
import { convertHtmlToText } from '../utils/html.js';

type ArticleListProps = {
  articles: Article[];
  selectedArticle?: Article;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function ArticleList({
  articles,
  selectedArticle,
  scrollOffset,
  onScrollOffsetChange,
}: ArticleListProps) {
  const { stdout } = useStdout();
  const [contentLines, setContentLines] = useState<string[]>([]);
  const [totalLines, setTotalLines] = useState(0);

  // 記事が変わったときにスクロール位置をリセット
  useEffect(() => {
    if (selectedArticle) {
      onScrollOffsetChange(0);
    }
  }, [selectedArticle?.id, onScrollOffsetChange]);

  // コンテンツの行を更新
  useEffect(() => {
    if (selectedArticle?.content) {
      const plainText = convertHtmlToText(selectedArticle.content);
      const lines = plainText.split('\n');
      setContentLines(lines);
      setTotalLines(lines.length);
    } else {
      setContentLines([]);
      setTotalLines(0);
    }
  }, [selectedArticle?.content]);

  // スクロールオフセットを最大値に制限
  useEffect(() => {
    const totalHeight = stdout?.rows || 24;
    const fixedLines = 16;
    const availableLines = Math.max(1, totalHeight - fixedLines);
    const maxOffset = Math.max(0, totalLines - availableLines);

    if (scrollOffset > maxOffset) {
      onScrollOffsetChange(maxOffset);
    }
  }, [scrollOffset, totalLines, stdout?.rows, onScrollOffsetChange]);

  // ターミナルの高さから表示可能な行数を計算
  const totalHeight = stdout?.rows || 24;

  // 固定要素の行数
  // - フッター（ヘルプ・件数）: 2行
  // - ヘッダー（タイトル）: 2行
  // - ヘッダー（日付）: 1行
  // - ヘッダー（URL）: 1行
  // - ステータス: 2行
  // - 各種マージン・パディング: 4行
  // - 境界線: 2行
  // - 安全マージン: 2行
  const fixedLines = 16;
  const availableLines = Math.max(1, totalHeight - fixedLines);

  if (articles.length === 0) {
    return (
      <Box flexDirection="column" height="100%" width="100%" padding={1} flexShrink={0}>
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
  const currentUnreadIndex = articles.findIndex((article) => article.id === selectedArticle?.id);
  const unreadPosition = currentUnreadIndex !== -1 ? currentUnreadIndex + 1 : 0;

  // 記事詳細を直接レンダリング（renderArticleDetail関数を使わない）
  if (!selectedArticle) {
    return (
      <Box
        flexDirection="column"
        height="100%"
        width="100%"
        borderStyle="single"
        borderLeft
        flexShrink={0}
      >
        <Box flexGrow={1} padding={1} justifyContent="center" alignItems="center">
          <Text color="gray" italic>
            記事を選択してください
          </Text>
        </Box>
        <Box padding={1} flexDirection="row">
          <Box flexGrow={1}>
            <Text color="gray" dimColor>
              ? でヘルプ表示
            </Text>
          </Box>
          <Box>
            <Text color="gray">
              {unreadPosition > 0 ? `${unreadPosition}/${unreadCount}件` : `未読${unreadCount}件`}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const content = selectedArticle.content || '';
  const publishedDate = selectedArticle.published_at.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // スクロール位置に基づいて表示する行を選択
  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + availableLines);
  const displayText = visibleLines.join('\n');

  // スクロール情報
  const hasMoreContent = scrollOffset + availableLines < totalLines;
  const scrollInfo =
    totalLines > availableLines
      ? `(${scrollOffset + 1}-${Math.min(scrollOffset + availableLines, totalLines)} / ${totalLines}行)`
      : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderLeft
      height="100%"
      width="100%"
      flexShrink={0}
    >
      {/* ヘッダー部分：固定 */}
      <Box paddingTop={1} paddingX={1}>
        <Text bold color="green">
          {selectedArticle.title}
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text color="gray">公開日: {publishedDate}</Text>
        {selectedArticle.author && <Text color="cyan"> | 著者: {selectedArticle.author}</Text>}
      </Box>
      <Box paddingX={1} marginBottom={1}>
        <Text color="yellow">URL: {selectedArticle.url}</Text>
      </Box>

      {/* コンテンツ部分：スクロール可能 */}
      {content && (
        <Box paddingX={1} height={availableLines} overflow="hidden">
          <Text wrap="wrap">{displayText}</Text>
        </Box>
      )}

      {/* ステータス部分：固定 */}
      <Box paddingX={1} marginTop={1}>
        <Text color="gray" dimColor>
          状態: {selectedArticle.is_read ? '既読' : '未読'}
          {selectedArticle.is_favorite ? ' | ★お気に入り' : ''}
          {scrollInfo && ` | ${scrollInfo}`}
          {hasMoreContent && ' スペースで続きを表示'}
        </Text>
      </Box>

      {/* フッター部分：固定 */}
      <Box padding={1} flexDirection="row">
        <Box flexGrow={1}>
          <Text color="gray" dimColor>
            ? でヘルプ表示
          </Text>
        </Box>
        <Box>
          <Text color="gray">
            {unreadPosition > 0 ? `${unreadPosition}/${unreadCount}件` : `未読${unreadCount}件`}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
