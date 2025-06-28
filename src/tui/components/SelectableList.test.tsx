import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect } from 'vitest';
import { SelectableList } from './SelectableList.js';

describe('SelectableList', () => {
  const mockItems = [
    { id: 1, displayText: 'Item 1', isRead: false, isFavorite: false },
    { id: 2, displayText: 'Item 2', isRead: true, isFavorite: false },
    { id: 3, displayText: 'Item 3', isRead: false, isFavorite: true },
  ];

  it('アイテムがない場合は空メッセージを表示する', () => {
    const { lastFrame } = render(<SelectableList items={[]} selectedIndex={0} />);

    expect(lastFrame()).toContain('アイテムがありません');
  });

  it('カスタム空メッセージを表示する', () => {
    const { lastFrame } = render(
      <SelectableList items={[]} selectedIndex={0} emptyMessage="何もないよ" />
    );

    expect(lastFrame()).toContain('何もないよ');
  });

  it('アイテム一覧を表示する', () => {
    const { lastFrame } = render(<SelectableList items={mockItems} selectedIndex={0} />);

    const output = lastFrame();
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).toContain('Item 3');
  });

  it('選択されたアイテムに>マークが表示される', () => {
    const { lastFrame } = render(<SelectableList items={mockItems} selectedIndex={1} />);

    const output = lastFrame();
    expect(output).toMatch(/> .*Item 2/);
  });

  it('未読アイテムに●マークが表示される', () => {
    const { lastFrame } = render(<SelectableList items={mockItems} selectedIndex={0} />);

    const output = lastFrame();
    expect(output).toMatch(/● Item 1/);
    expect(output).not.toMatch(/● Item 2/); // 既読なので●なし
  });

  it('お気に入りアイテムに★マークが表示される', () => {
    const { lastFrame } = render(<SelectableList items={mockItems} selectedIndex={2} />);

    const output = lastFrame();
    expect(output).toMatch(/★ .*Item 3/);
  });

  it('バッジが表示される', () => {
    const itemsWithBadge = [{ id: 1, displayText: 'Item with badge', badge: '5件' }];

    const { lastFrame } = render(<SelectableList items={itemsWithBadge} selectedIndex={0} />);

    const output = lastFrame();
    expect(output).toContain('(5件)');
  });

  it('カスタムレンダリング関数が使用される', () => {
    const customRender = (item: any) => <Text key={item.id}>Custom: {item.displayText}</Text>;

    const { lastFrame } = render(
      <SelectableList items={mockItems} selectedIndex={0} renderItem={customRender} />
    );

    const output = lastFrame();
    expect(output).toContain('Custom: Item 1');
  });
});
