import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// 単純なコンポーネントでテスト環境を確認
const TestComponent = () => <Text>Hello Test</Text>;

describe('Simple Test', () => {
  it('should render text', () => {
    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toContain('Hello Test');
  });
});
