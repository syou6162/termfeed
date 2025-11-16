import { Box, Text } from 'ink';
import type { ErrorInfo } from '../types/error.js';

interface FailedFeed {
  feedUrl: string;
  error: Error;
}

interface ErrorViewProps {
  latestError?: ErrorInfo;
  errors: ErrorInfo[];
  failedFeeds: FailedFeed[];
  showFailedFeeds: boolean;
}

/**
 * エラー状態を表示するコンポーネント
 */
export function ErrorView({ latestError, errors, failedFeeds, showFailedFeeds }: ErrorViewProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">
        エラーが発生しました
      </Text>
      {latestError && (
        <>
          <Text color="red">
            [{latestError.source.toUpperCase()}] {latestError.message}
          </Text>
          <Text color="gray" dimColor>
            発生時刻: {latestError.timestamp.toLocaleTimeString('ja-JP')}
          </Text>
        </>
      )}
      {errors.length > 1 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">エラー履歴 ({errors.length}件):</Text>
          {errors.slice(-3).map((err, index) => (
            <Text key={index} color="gray" dimColor>
              • [{err.source}]{' '}
              {err.message.length > 40 ? err.message.substring(0, 40) + '...' : err.message}
            </Text>
          ))}
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">
          r: 再試行 | {failedFeeds.length > 0 ? 'e: エラー詳細 | ' : ''}q: 終了
        </Text>
      </Box>
      {showFailedFeeds && failedFeeds.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            失敗したフィード:
          </Text>
          {failedFeeds.map((failed, index) => (
            <Box key={index} flexDirection="column" marginLeft={2}>
              <Text color="red">• {failed.feedUrl}</Text>
              <Text color="gray" dimColor>
                エラー: {failed.error.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
