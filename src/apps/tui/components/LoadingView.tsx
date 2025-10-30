import { Box, Text } from 'ink';

interface UpdateProgress {
  currentIndex: number;
  totalFeeds: number;
  currentFeedTitle: string;
  currentFeedUrl: string;
}

interface LoadingViewProps {
  updateProgress?: UpdateProgress;
}

/**
 * ローディング状態を表示するコンポーネント
 */
export function LoadingView({ updateProgress }: LoadingViewProps) {
  return (
    <Box justifyContent="center" alignItems="center" height="100%">
      <Box flexDirection="column" alignItems="center">
        {updateProgress ? (
          <>
            <Text color="yellow">
              フィード更新中 ({updateProgress.currentIndex}/{updateProgress.totalFeeds})
            </Text>
            <Text color="gray">現在: {updateProgress.currentFeedTitle}</Text>
            <Text color="gray" dimColor>
              {updateProgress.currentFeedUrl}
            </Text>
            <Box marginTop={1}>
              <Text color="cyan">ESC: キャンセル</Text>
            </Box>
          </>
        ) : (
          <Text color="yellow">読み込み中...</Text>
        )}
      </Box>
    </Box>
  );
}
