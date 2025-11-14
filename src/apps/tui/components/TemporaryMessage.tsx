import { Box, Text } from 'ink';

interface TemporaryMessageProps {
  message: string | null;
}

/**
 * 一時的なメッセージを表示するオーバーレイコンポーネント
 */
export function TemporaryMessage({ message }: TemporaryMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <Box position="absolute" marginLeft={2} marginTop={2}>
      <Box borderStyle="round" padding={1}>
        <Text color="yellow">{message}</Text>
      </Box>
    </Box>
  );
}
