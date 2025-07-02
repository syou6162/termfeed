import { Box, Text } from 'ink';

type HelpOverlayProps = {
  isVisible: boolean;
};

export function HelpOverlay({ isVisible }: HelpOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Box width="100%" height="100%" borderStyle="single" padding={2} flexDirection="column">
      <Text bold color="blue">
        📚 termfeed - キーボードショートカット
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">
          記事操作:
        </Text>
        <Text> j / ↓ 次の記事に移動</Text>
        <Text> k / ↑ 前の記事に移動</Text>
        <Text> v ブラウザで記事を開く</Text>
        <Text> f お気に入り切り替え</Text>
        <Text> p ピンを立てる/外す</Text>
        <Text> o ピンした記事をまとめて開く</Text>
        <Text> スペース 記事を下にスクロール</Text>
        <Text> g 記事の先頭へ移動</Text>
        <Text> G 記事の末尾へ移動</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">
          フィード操作:
        </Text>
        <Text> s 次のフィードに移動</Text>
        <Text> a 前のフィードに移動</Text>
        <Text> r 全フィードを更新</Text>
        <Text> 0-5 フィードにレーティングを設定 (0=なし, 5=最高)</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">
          その他:
        </Text>
        <Text> ? このヘルプを表示/非表示</Text>
        <Text> q 終了</Text>
        <Text> Ctrl+C 強制終了</Text>
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          💡 ヒント: 記事を読むとフィード移動時に自動的に既読になります
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="cyan">? キーを再度押すとヘルプを閉じます</Text>
      </Box>
    </Box>
  );
}
